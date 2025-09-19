import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, ActivityIndicator,
  TouchableOpacity, Dimensions, Animated, Keyboard
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { haversine } from '../utils/haversine';

const { width, height } = Dimensions.get('window');
const LOCATIONIQ_KEY = 'pk.c09af81eae38ab3e2065f77fe4ff6d64'; // Usá tu propia API key si tenés

export default function HomeScreen() {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [selectedCoord, setSelectedCoord] = useState(null);
  const [distance, setDistance] = useState(null);
  const mapRef = useRef(null);

  // Panel animation (opcional, podés sacar si no querés animación)
  const [panelExpanded, setPanelExpanded] = useState(false);
  const panelHeight = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permiso de ubicación denegado');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      const initialRegion = {
        latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01
      };
      setRegion(initialRegion);
      setLocation({ latitude, longitude });
    })();
  }, []);

  useEffect(() => {
    if (location && selectedCoord) {
      const dist = haversine(
        location.latitude,
        location.longitude,
        selectedCoord.latitude,
        selectedCoord.longitude
      );
      setDistance(dist);
    } else {
      setDistance(null);
    }
  }, [location, selectedCoord]);

  const fetchSuggestions = async (text) => {
    setAddress(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(text)}&limit=5&dedupe=1&normalizeaddress=1`
      );
      let data = await response.json();
      // Ordenar por cercanía si hay ubicación actual
      if (location && Array.isArray(data)) {
        data = data
          .map(item => {
            if (item.lat && item.lon) {
              const dist = haversine(
                location.latitude,
                location.longitude,
                parseFloat(item.lat),
                parseFloat(item.lon)
              );
              return { ...item, _distance: dist };
            }
            return { ...item, _distance: Infinity };
          })
          .sort((a, b) => a._distance - b._distance);
      }
      setSuggestions(data);
    } catch (error) {
      setSuggestions([]);
    }
    setLoading(false);
  };

  const handleSelectSuggestion = (item) => {
    setAddress(item.display_name);
    setSuggestions([]);
    if (item.lat && item.lon) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      setSelectedCoord({
        latitude: lat,
        longitude: lon,
        title: item.display_name
      });
      setRegion({
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      });
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }, 1000);
      }
    }
  };

  const handleTuUbicacion = async () => {
    if (!location) return;
    setAddress(`${location.latitude},${location.longitude}`);
    setSelectedCoord({
      latitude: location.latitude,
      longitude: location.longitude,
      title: 'Tu ubicación actual'
    });
    setRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    });
    setSuggestions([]);
  };

  return (
    <View style={styles.main}>
      <MapView
        ref={mapRef}
        style={styles.mapa}
        region={region}
        showsUserLocation
        showsMyLocationButton
      >
        {selectedCoord && (
          <Marker
            coordinate={{
              latitude: selectedCoord.latitude,
              longitude: selectedCoord.longitude
            }}
            title={selectedCoord.title}
          />
        )}
      </MapView>
      {/* Panel superior para buscar */}
      <Animated.View style={[
        styles.panel,
        { top: 40, left: 0, right: 0, height: panelHeight }
      ]}>
        <View style={styles.inputRow}>
          <Ionicons name="search" size={22} color="#222" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Ingresa la dirección"
            style={styles.input}
            value={address}
            onChangeText={fetchSuggestions}
            placeholderTextColor="#888"
          />
        </View>
        {address.length > 0 && suggestions.length > 0 && (
          <View style={styles.autocompleteList}>
            {loading && <ActivityIndicator size="small" color="#009FE3" />}
            {suggestions.map((item, idx) => (
              <TouchableOpacity
                key={item.place_id || idx}
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Ionicons name="location-outline" size={18} color="#009FE3" style={{ marginRight: 8 }} />
                <Text style={{ color: "#222", flex: 1 }}>{item.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {(!address || suggestions.length === 0) && (
          <TouchableOpacity style={styles.favItem} onPress={handleTuUbicacion}>
            <Ionicons name="person" size={20} color="#009FE3" style={{ marginRight: 8 }} />
            <Text style={styles.favText}>Tu ubicación</Text>
          </TouchableOpacity>
        )}
        {distance !== null && (
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Text style={styles.distance}>
              Distancia: {(distance / 1000).toFixed(2)} km
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: '#fff' },
  mapa: { flex: 1 },
  panel: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    elevation: 10,
    zIndex: 10,
    minHeight: 120,
    maxHeight: 400,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    backgroundColor: 'transparent',
  },
  favItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  favText: {
    color: '#009FE3',
    fontSize: 16,
  },
  autocompleteList: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 6,
    marginTop: 2,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  distance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#009FE3',
  },
});
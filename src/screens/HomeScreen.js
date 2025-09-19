import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, ActivityIndicator,
  TouchableOpacity, Dimensions, Animated
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, FontAwesome, Entypo, MaterialIcons, Foundation } from '@expo/vector-icons';
import { haversine } from '../utils/haversine';

const { width, height } = Dimensions.get('window');
const LOCATIONIQ_KEY = 'pk.c09af81eae38ab3e2065f77fe4ff6d64';

// Relación tag -> icono (agregados muchos más)
const POI_ICONS = {
  restaurant: <MaterialCommunityIcons name="silverware-fork-knife" size={28} color="#FF9800" />,
  cafe: <MaterialCommunityIcons name="coffee" size={28} color="#795548" />,
  bar: <MaterialCommunityIcons name="glass-cocktail" size={28} color="#009FE3" />,
  fast_food: <MaterialCommunityIcons name="food" size={28} color="#FF5722" />,
  bank: <FontAwesome5 name="university" size={26} color="#4CAF50" />,
  pharmacy: <MaterialCommunityIcons name="pharmacy" size={28} color="#8BC34A" />,
  hospital: <MaterialCommunityIcons name="hospital-building" size={28} color="#E91E63" />,
  school: <MaterialCommunityIcons name="school" size={28} color="#3F51B5" />,
  supermarket: <MaterialCommunityIcons name="cart" size={28} color="#607D8B" />,
  parking: <MaterialCommunityIcons name="parking" size={28} color="#607D8B" />,
  atm: <FontAwesome5 name="money-bill-wave" size={26} color="#009688" />,
  bus_station: <MaterialIcons name="directions-bus" size={28} color="#009FE3" />,
  train_station: <MaterialIcons name="train" size={28} color="#607D8B" />,
  subway: <MaterialCommunityIcons name="subway-variant" size={28} color="#607D8B" />,
  taxi: <MaterialCommunityIcons name="taxi" size={28} color="#FFEB3B" />,
  police: <MaterialCommunityIcons name="police-badge" size={28} color="#1976D2" />,
  fire_station: <MaterialCommunityIcons name="fire-truck" size={28} color="#F44336" />,
  post_office: <MaterialCommunityIcons name="email" size={28} color="#607D8B" />,
  library: <MaterialCommunityIcons name="library" size={28} color="#3F51B5" />,
  cinema: <MaterialCommunityIcons name="movie" size={28} color="#E91E63" />,
  barbershop: <MaterialCommunityIcons name="content-cut" size={28} color="#795548" />,
  hairdresser: <MaterialCommunityIcons name="scissors-cutting" size={28} color="#795548" />,
  bakery: <MaterialCommunityIcons name="bread-slice" size={28} color="#FF9800" />,
  hotel: <FontAwesome5 name="hotel" size={26} color="#009FE3" />,
  hostel: <FontAwesome5 name="bed" size={26} color="#607D8B" />,
  gas_station: <MaterialCommunityIcons name="gas-station" size={28} color="#FF5722" />,
  charging_station: <MaterialCommunityIcons name="ev-station" size={28} color="#4CAF50" />,
  car_rental: <FontAwesome5 name="car" size={26} color="#607D8B" />,
  car_wash: <MaterialCommunityIcons name="car-wash" size={28} color="#009FE3" />,
  dentist: <MaterialCommunityIcons name="tooth" size={28} color="#8BC34A" />,
  doctor: <FontAwesome5 name="user-md" size={26} color="#E91E63" />,
  optician: <MaterialCommunityIcons name="glasses" size={28} color="#607D8B" />,
  veterinarian: <MaterialCommunityIcons name="dog" size={28} color="#795548" />,
  ice_cream: <MaterialCommunityIcons name="ice-cream" size={28} color="#00BCD4" />,
  pub: <MaterialCommunityIcons name="beer" size={28} color="#FF9800" />,
  nightclub: <MaterialCommunityIcons name="music" size={28} color="#9C27B0" />,
  museum: <MaterialCommunityIcons name="bank" size={28} color="#607D8B" />,
  park: <MaterialCommunityIcons name="tree" size={28} color="#4CAF50" />,
  playground: <MaterialCommunityIcons name="slide" size={28} color="#FFEB3B" />,
  swimming_pool: <MaterialCommunityIcons name="pool" size={28} color="#03A9F4" />,
  university: <MaterialCommunityIcons name="school" size={28} color="#3F51B5" />,
  college: <MaterialCommunityIcons name="school" size={28} color="#3F51B5" />,
  kindergarten: <MaterialCommunityIcons name="baby-face-outline" size={28} color="#FFEB3B" />,
  courthouse: <MaterialCommunityIcons name="gavel" size={28} color="#607D8B" />,
  embassy: <MaterialCommunityIcons name="flag" size={28} color="#009FE3" />,
  place_of_worship: <MaterialCommunityIcons name="church" size={28} color="#607D8B" />,
  cemetery: <MaterialCommunityIcons name="grave-stone" size={28} color="#607D8B" />,
  // fallback
  default: <Ionicons name="location" size={28} color="#FF9800" />,
};

export default function HomeScreen() {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [selectedCoord, setSelectedCoord] = useState(null);
  const [distance, setDistance] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);
  const [pois, setPois] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);
  const [poiRouting, setPoiRouting] = useState(null); // POI seleccionado para ruta
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

  // Buscar POIs cercanos cuando se obtiene la ubicación (radio expandido a 800m ~10 cuadras)
  useEffect(() => {
    const fetchPOIs = async (lat, lon) => {
      try {
        const response = await fetch(
          `https://us1.locationiq.com/v1/nearby?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&tag=amenity&radius=800&limit=30`
        );
        const data = await response.json();
        setPois(Array.isArray(data) ? data : []);
      } catch (e) {
        setPois([]);
      }
    };
    if (location && !selectedCoord && !poiRouting) {
      fetchPOIs(location.latitude, location.longitude);
    }
  }, [location, selectedCoord, poiRouting]);

  // Calcular distancia haversine (solo para ordenar autocomplete)
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

  // Calcular distancia real (ruteo) y obtener polyline para marcar el camino
  useEffect(() => {
    const fetchRouteDistance = async (from, to) => {
      try {
        const response = await fetch(
          `https://us1.locationiq.com/v1/directions/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?key=${LOCATIONIQ_KEY}&overview=full&geometries=geojson`
        );
        const data = await response.json();
        if (data && data.routes && data.routes[0]) {
          setRouteDistance(data.routes[0].distance); // en metros
          // Polyline
          if (
            data.routes[0].geometry &&
            data.routes[0].geometry.coordinates
          ) {
            const coords = data.routes[0].geometry.coordinates.map(([lon, lat]) => ({
              latitude: lat,
              longitude: lon,
            }));
            setRouteCoords(coords);
          } else {
            setRouteCoords([]);
          }
        } else {
          setRouteDistance(null);
          setRouteCoords([]);
        }
      } catch (e) {
        setRouteDistance(null);
        setRouteCoords([]);
      }
    };
    // Si hay un POI seleccionado para ruta, priorizarlo
    if (location && poiRouting) {
      fetchRouteDistance(location, poiRouting);
    } else if (location && selectedCoord) {
      fetchRouteDistance(location, selectedCoord);
    } else {
      setRouteDistance(null);
      setRouteCoords([]);
    }
  }, [location, selectedCoord, poiRouting]);

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
    setPoiRouting(null); // Limpiar ruta a POI si se selecciona una dirección
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
    setPoiRouting(null);
    setRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    });
    setSuggestions([]);
  };

  // Al apretar un POI, marcar ruta y ocultar los POIs
  const handlePoiPress = (poi) => {
    setPoiRouting({
      latitude: parseFloat(poi.lat),
      longitude: parseFloat(poi.lon),
      title: poi.name || poi.type || 'POI',
      poiType: poi.type,
      poiName: poi.name || poi.type || 'POI'
    });
    setSelectedCoord(null);
    setAddress('');
    setSuggestions([]);
    setRegion({
      latitude: parseFloat(poi.lat),
      longitude: parseFloat(poi.lon),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    });
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: parseFloat(poi.lat),
        longitude: parseFloat(poi.lon),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 1000);
    }
  };

  // Al apretar el botón "Limpiar ruta"
  const handleClearRoute = () => {
    setPoiRouting(null);
    setSelectedCoord(null);
    setRouteCoords([]);
    setRouteDistance(null);
    setAddress('');
    setSuggestions([]);
  };

  // Obtener el icono adecuado para el POI
  const getPoiIcon = (poi) => {
    if (poi.type && POI_ICONS[poi.type]) return POI_ICONS[poi.type];
    if (poi.category && POI_ICONS[poi.category]) return POI_ICONS[poi.category];
    return POI_ICONS.default;
  };

  // Mostrar el nombre del destino actual (POI o dirección)
  const currentDestTitle = poiRouting?.title || selectedCoord?.title;

  return (
    <View style={styles.main}>
      <MapView
        ref={mapRef}
        style={styles.mapa}
        region={region}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Marcador de destino (dirección o POI) */}
        {(selectedCoord || poiRouting) && (
          <Marker
            coordinate={selectedCoord || poiRouting}
            title={currentDestTitle}
            pinColor="#009FE3"
          />
        )}
        {/* Mostrar POIs cercanos SOLO si no hay ruta activa */}
        {!poiRouting && !selectedCoord && pois && pois.length > 0 && pois.map((poi, idx) => (
          <Marker
            key={poi.osm_id || idx}
            coordinate={{
              latitude: parseFloat(poi.lat),
              longitude: parseFloat(poi.lon)
            }}
            title={poi.name || poi.type}
            pinColor="#FF9800"
            onPress={() => handlePoiPress(poi)}
          >
            {getPoiIcon(poi)}
          </Marker>
        ))}
        {/* Polyline del camino */}
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#009FE3"
            strokeWidth={5}
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
        {/* Distancia haversine (lineal) */}
        {distance !== null && !poiRouting && (
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Text style={styles.distance}>
              Distancia (línea recta): {(distance / 1000).toFixed(2)} km
            </Text>
          </View>
        )}
        {/* Distancia real (ruteo) y nombre del POI si corresponde */}
        {routeDistance !== null && (
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            {poiRouting?.poiName && (
              <Text style={[styles.poiName]}>
                {getPoiIcon(poiRouting)}{' '}
                {poiRouting.poiName}
              </Text>
            )}
            <Text style={[styles.distance, { color: '#FF9800' }]}>
              Distancia real: {(routeDistance / 1000).toFixed(2)} km
            </Text>
            {(poiRouting || selectedCoord) && (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearRoute}>
                <Ionicons name="close-circle" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Limpiar ruta</Text>
              </TouchableOpacity>
            )}
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
  poiName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 10,
    alignSelf: 'center',
  },
});
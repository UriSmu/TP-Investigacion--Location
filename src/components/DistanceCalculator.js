import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import haversine from '../utils/haversine';

const DistanceCalculator = ({ targetLocation }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (currentLocation && targetLocation) {
      const dist = haversine(
        currentLocation.latitude,
        currentLocation.longitude,
        targetLocation.latitude,
        targetLocation.longitude
      );
      setDistance(dist);
    }
  }, [currentLocation, targetLocation]);

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      {distance !== null ? (
        <Text style={styles.distanceText}>
          Distance to target: {distance.toFixed(2)} meters
        </Text>
      ) : (
        <Text style={styles.distanceText}>Select a target location</Text>
      )}
      <Button title="Refresh Location" onPress={() => setCurrentLocation(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 18,
    marginVertical: 10,
  },
});

export default DistanceCalculator;
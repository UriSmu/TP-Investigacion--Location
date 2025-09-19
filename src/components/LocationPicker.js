import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import * as Location from 'expo-location';

const LocationPicker = ({ onLocationSelected }) => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
    })();
  }, []);

  const handleSelectLocation = () => {
    if (location) {
      onLocationSelected(location);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a Location</Text>
      {errorMsg ? (
        <Text style={styles.error}>{errorMsg}</Text>
      ) : (
        <Text style={styles.location}>
          Current Location: {location ? `${location.latitude}, ${location.longitude}` : 'Fetching...'}
        </Text>
      )}
      <TextInput
        style={styles.input}
        placeholder="Enter address or coordinates"
        value={address}
        onChangeText={setAddress}
      />
      <Button title="Select Location" onPress={handleSelectLocation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  error: {
    color: 'red',
  },
  location: {
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
});

export default LocationPicker;
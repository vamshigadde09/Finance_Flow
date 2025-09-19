import React from 'react';
import { View, StyleSheet } from 'react-native';
import Stats from '../../components/tabs/Stats';

export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Stats />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SplitGroups from '../../components/tabs/Groups/SplitGroups';

export default function GroupsScreen() {
  return (
    <View style={styles.container}>
      <SplitGroups />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

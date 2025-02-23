import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton, Divider } from 'react-native-paper';

interface HeaderProps {
  activeCommName: string;
  onMenuPress: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeCommName, onMenuPress }) => (
  <>
    <View style={styles.header}>
      <IconButton icon="menu" size={26} onPress={onMenuPress} />
      <Text variant="headlineSmall" style={styles.activeCommTitle}>
        {activeCommName}
      </Text>
    </View>
    <Divider style={styles.divider} />
  </>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  activeCommTitle: {
    flex: 1,
    marginLeft: 8,
    color: '#007AFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
});
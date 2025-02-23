import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';

const TABS = [
  { id: 'community', label: 'Community', icon: 'post' },
  { id: 'courses', label: 'Courses', icon: 'book-open-variant' },
  { id: 'announcements', label: 'Updates', icon: 'bell' },
  { id: 'members', label: 'Members', icon: 'account-group' },
  { id: 'settings', label: 'Settings', icon: 'cog' }
];

interface TabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => (
  <View style={styles.tabsContainer}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
      {TABS.map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.activeTab]}
          onPress={() => onTabChange(tab.id)}
        >
          <IconButton
            icon={tab.icon}
            size={20}
            iconColor={activeTab === tab.id ? '#007AFF' : '#666666'}
          />
          <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
  },
  tabsContent: {
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#007AFF15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginLeft: -4,
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
})
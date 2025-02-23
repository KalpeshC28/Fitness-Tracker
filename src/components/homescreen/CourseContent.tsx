import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Card, Text, Button, IconButton } from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av';
import { Course, CourseLesson } from '../../types/course';
import { CreateCourseModal } from '../modals/CreateCourseModal';

interface CourseContentProps {
  courses: Course[];
  isAdmin: boolean;
  communityId: string;
  onCourseUpdate: () => void;
}

export const CourseContent: React.FC<CourseContentProps> = ({ courses, isAdmin, communityId, onCourseUpdate }) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CourseLesson | null>(null);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const renderCourseItem = ({ item }: { item: Course }) => (
    <Card style={styles.courseCard} onPress={() => setSelectedCourse(item)}>
      {item.cover_image && <Card.Cover source={{ uri: item.cover_image }} />}
      <Card.Title title={item.title} subtitle={`${item.sections?.length || 0} sections`} />
      <Card.Content>
        <Text variant="bodyMedium">{item.description}</Text>
        <Text variant="bodySmall" style={styles.price}>
          {item.price > 0 ? `$${item.price.toFixed(2)}` : "Free"}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {isAdmin && (
        <Button
          mode="contained"
          icon="plus"
          onPress={() => setShowCreateCourse(true)}
          style={styles.createCourseButton}
        >
          Create Course
        </Button>
      )}

      {selectedCourse ? (
        <View style={styles.courseDetail}>
          <View style={styles.courseHeader}>
            <IconButton icon="arrow-left" onPress={() => { setSelectedCourse(null); setSelectedLesson(null); }} />
            <Text variant="headlineSmall">{selectedCourse.title}</Text>
          </View>

          {selectedLesson ? (
            <View style={styles.lessonView}>
              <View style={styles.videoContainer}>
                {!isVideoPlaying && selectedLesson.thumbnail_url && (
                  <Image
                    source={{ uri: selectedLesson.thumbnail_url }}
                    style={[styles.video, styles.thumbnailOverlay]}
                    resizeMode="cover"
                  />
                )}
                <Video
                  source={{ uri: selectedLesson.video_url }}
                  useNativeControls
                  style={styles.video}
                  resizeMode={ResizeMode.CONTAIN}
                  onReadyForDisplay={() => setIsVideoPlaying(true)}
                  onLoadStart={() => setIsVideoPlaying(false)}
                />
              </View>
              <Text variant="titleMedium">{selectedLesson.title}</Text>
              <Text variant="bodyMedium">{selectedLesson.description}</Text>
            </View>
          ) : (
            <ScrollView style={styles.sectionsContainer}>
              {selectedCourse.sections?.map((section) => (
                <Card key={section.id} style={styles.sectionCard}>
                  <Card.Title title={section.title} />
                  <Card.Content>
                    {section.lessons?.map((lesson) => (
                      <TouchableOpacity
                        key={lesson.id}
                        style={styles.lessonItem}
                        onPress={() => setSelectedLesson(lesson)}
                      >
                        {lesson.thumbnail_url && (
                          <Image source={{ uri: lesson.thumbnail_url }} style={styles.thumbnail} />
                        )}
                        <View style={styles.lessonInfo}>
                          <Text variant="bodyMedium">{lesson.title}</Text>
                          <Text variant="bodySmall">
                            {Math.floor(lesson.duration / 60)}:
                            {(lesson.duration % 60).toString().padStart(2, '0')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.courseList}
          ListEmptyComponent={<Text variant="bodyLarge">No courses available</Text>}
        />
      )}

      <CreateCourseModal
        visible={showCreateCourse}
        onDismiss={() => setShowCreateCourse(false)}
        onSuccess={() => {
          setShowCreateCourse(false);
          onCourseUpdate();
        }}
        communityId={communityId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  createCourseButton: { margin: 16 },
  courseList: { padding: 16, gap: 16 },
  courseCard: { marginBottom: 16, elevation: 2 },
  courseDetail: { flex: 1 },
  courseHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0' 
  },
  sectionsContainer: { flex: 1 },
  sectionCard: { margin: 16, elevation: 2 },
  lessonItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0' 
  },
  lessonInfo: { flex: 1, marginLeft: 8 },
  lessonView: { flex: 1, padding: 16 },
  videoContainer: { position: 'relative', width: '100%', height: 250 },
  video: { 
    width: '100%', 
    aspectRatio: 16/9, 
    marginBottom: 16, 
    backgroundColor: '#000', 
    borderRadius: 8 
  },
  thumbnail: { width: 80, height: 45, borderRadius: 4, marginRight: 8 },
  thumbnailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  price: { marginTop: 8, color: '#007AFF', fontWeight: '600' },
});
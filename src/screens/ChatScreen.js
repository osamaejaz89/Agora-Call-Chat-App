import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Slider from '@react-native-community/slider';
import RNFS from 'react-native-fs';

const ChatScreen = ({route}) => {
  const {channelId} = route.params;
  const currentUserId = auth().currentUser?.uid;
  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;

  // States
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioPath, setAudioPath] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [playbackState, setPlaybackState] = useState({
    currentPosition: 0,
    duration: 0,
  });

  // Fetch messages
  useEffect(() => {
    if (!currentUserId || !channelId) return;

    const unsubscribe = firestore()
      .collection('channels')
      .doc(channelId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(fetchedMessages);
      });

    return () => unsubscribe();
  }, [currentUserId, channelId]);

  // Audio Recording
  const ensureDirectory = useCallback(async () => {
    const path = `${RNFS.DocumentDirectoryPath}/Audio`;
    if (!(await RNFS.exists(path))) {
      await RNFS.mkdir(path);
    }
    return path;
  }, []);

  const startRecording = async () => {
    try {
      const directory = await ensureDirectory();
      const filePath = `${directory}/${Date.now()}_recording.aac`;
      await audioRecorderPlayer.startRecorder(filePath);
      setAudioPath(filePath);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Unable to start recording.');
    }
  };

  const stopRecording = async () => {
    try {
      const filePath = await audioRecorderPlayer.stopRecorder();
      setIsRecording(false);
      setAudioPath('');
      await uploadFile(filePath, 'audio', 'recording.aac');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Unable to stop recording.');
    }
  };

  // Audio Playback
  useEffect(() => {
    return () => audioRecorderPlayer.stopPlayer(); // Cleanup on unmount
  }, [audioRecorderPlayer]);

  const playAudio = async audioUrl => {
    try {
      if (currentAudio === audioUrl && isPlaying) {
        await audioRecorderPlayer.pausePlayer();
        setIsPlaying(false);
      } else {
        if (isPlaying) {
          await audioRecorderPlayer.stopPlayer();
        }
        setCurrentAudio(audioUrl);
        setIsPlaying(true);

        audioRecorderPlayer.addPlayBackListener(e => {
          setPlaybackState({
            currentPosition: e.currentPosition,
            duration: e.duration,
          });

          if (e.currentPosition >= e.duration) {
            setIsPlaying(false);
            audioRecorderPlayer.stopPlayer();
          }
        });

        await audioRecorderPlayer.startPlayer(audioUrl);
      }
    } catch (error) {
      console.error('Error during playback:', error);
    }
  };

  // File Upload
  const uploadFile = async (fileUri, type, fileName) => {
    setUploading(true);
    try {
      const cloudName = 'osamaejaz89';
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: type === 'audio' ? 'audio/mpeg' : 'application/octet-stream',
        name: fileName,
      });
      formData.append('upload_preset', 'demo-call');

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        formData,
        {headers: {'Content-Type': 'multipart/form-data'}},
      );

      await firestore()
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .add({
          fileUrl: response.data.secure_url,
          type,
          fileName,
          createdAt: firestore.FieldValue.serverTimestamp(),
          senderId: currentUserId,
        });
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload the file.');
    } finally {
      setUploading(false);
    }
  };

  // Render Methods
  const renderAudioMessage = ({item}) => {
    const isSender = item.senderId === currentUserId;
    return (
      <View
        style={[
          styles.messageContainer,
          isSender ? styles.sender : styles.receiver,
        ]}>
        <TouchableOpacity onPress={() => playAudio(item.fileUrl)}>
          <Icon
            name={currentAudio === item.fileUrl && isPlaying ? 'pause' : 'play'}
            size={24}
            color="#4CAF50"
          />
        </TouchableOpacity>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={playbackState.duration || 1}
          value={playbackState.currentPosition}
          minimumTrackTintColor="#4CAF50"
          onSlidingComplete={value => audioRecorderPlayer.seekToPlayer(value)}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={item =>
          item.type === 'audio' ? renderAudioMessage(item) : null
        }
        keyExtractor={item => item.id}
        inverted
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity onPressIn={startRecording} onPressOut={stopRecording}>
          <Icon
            name={isRecording ? 'mic' : 'mic-outline'}
            size={24}
            color={isRecording ? 'red' : '#4CAF50'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  sender: {backgroundColor: '#4CAF50', alignSelf: 'flex-end', borderRadius: 10},
  receiver: {
    backgroundColor: '#E0E0E0',
    alignSelf: 'flex-start',
    borderRadius: 10,
  },
  inputContainer: {flexDirection: 'row', padding: 10, backgroundColor: '#fff'},
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
  },
  slider: {flex: 1, height: 40, marginHorizontal: 10},
});

export default ChatScreen;

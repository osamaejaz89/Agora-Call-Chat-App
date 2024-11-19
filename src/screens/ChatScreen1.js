import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import DocumentPicker from 'react-native-document-picker';
import {launchImageLibrary} from 'react-native-image-picker';
import axios from 'axios';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {WebView} from 'react-native-webview'; // Import WebView
import Slider from '@react-native-community/slider'; // Add this for playback slider
import RNFS from 'react-native-fs';
import {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVModeIOSOption,
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
} from 'react-native-audio-recorder-player';
import SoundPlayer from 'react-native-sound-player';

const ChatScreen = ({route}) => {
  const {channelId, otherUserName} = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isFile, setIsFile] = useState(false); // New state to handle file display

  const [currentAudio, setCurrentAudio] = useState(null); // Audio playback state
  const playbackState = useRef({
    currentPosition: 0,
    duration: 0,
  }).current;

  const currentUserId = auth().currentUser?.uid;
  const navigation = useNavigation();

  // Audio Recorder Setup
  const audioRecorderPlayer = new AudioRecorderPlayer();
  const [isRecording, setIsRecording] = useState(false);
  const [audioPath, setAudioPath] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const ensureDirectory = async () => {
    const path = RNFS.DocumentDirectoryPath + '/Audio';
    if (!(await RNFS.exists(path))) {
      await RNFS.mkdir(path);
    }
    return path;
  };

  useEffect(() => {
    ensureDirectory();
  }, []);

  useEffect(() => {
    if (!currentUserId || !channelId) {
      console.error('Current user or channel ID is undefined.');
      return;
    }

    const unsubscribe = firestore()
      .collection('channels')
      .doc(channelId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        if (snapshot.empty) {
          setMessages([]);
          return;
        }
        const fetchedMessages = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          };
        });

        setMessages(fetchedMessages);
      });

    return unsubscribe;
  }, [currentUserId, channelId]);

  const startRecording = async () => {
    // Let's get creative and generate a unique audio name!
    const generateAudioName = () => {
      // Come up with a funky way to generate a name here!
    };
    const path = `${generateAudioName()}.aac`;
    // Set up the audio settings for our recording adventure
    const audioSet = {
      AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
      AudioSourceAndroid: AudioSourceAndroidType.MIC,
      AVModeIOS: AVModeIOSOption.measurement,
      AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
      AVNumberOfChannelsKeyIOS: 2,
      AVFormatIDKeyIOS: AVEncodingOption.aac,
    };
    const meteringEnabled = false;
    // Let the countdown begin…or not!
    await setCountdown(0);
    await setSeconds(0);
    await setMinutes(0);
    setStartCountdown(true);
    try {
      // Start the recording and get the audio URI
      const uri = await audioRecorderPlayer?.current?.startRecorder(
        path,
        audioSet,
        meteringEnabled,
      );
      setIsRecording(true);
      setAudio;
      setAudioPath(uri);
    } catch (error) {
      console.log('Uh-oh! Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    setStartCountdown(false);
    try {
      // Stop the recording and see what we've got
      const result = await audioRecorderPlayer?.current?.stopRecorder();
      setIsRecording(false);
    } catch (error) {
      console.log('Oops! Failed to stop recording:', error);
    }
  };

  const sendMessage = async () => {
    if (!currentUserId || !channelId) {
      console.error('Current user or channel ID is undefined.');
      return;
    }

    if (text.trim() === '') return;

    try {
      await firestore()
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .add({
          text,
          createdAt: firestore.FieldValue.serverTimestamp(),
          senderId: currentUserId,
        });
      setText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const uploadFile = async (fileUri, type, fileName) => {
    setUploading(true);
    const uploadPreset = 'demo-call';
    const cloudName = 'osamaejaz89';

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type:
        type === 'image'
          ? 'image/jpeg'
          : type === 'audio'
          ? 'audio/mpeg'
          : 'application/pdf',
      name: fileName,
    });
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      const fileUrl = response.data.secure_url;
      const fileType = response.data.resource_type;

      const message = {
        fileUrl,
        type:
          fileType === 'image'
            ? 'image'
            : fileType === 'audio'
            ? 'audio'
            : 'file',
        fileName,
        createdAt: firestore.FieldValue.serverTimestamp(),
        senderId: currentUserId,
      };

      await firestore()
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .add(message);
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
      });

      if (result.didCancel) {
        console.log('User cancelled image picker');
      } else if (result.errorCode) {
        console.error('ImagePicker Error: ', result.errorMessage);
        Alert.alert('Error', 'Failed to pick image.');
      } else if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        uploadFile(asset.uri, 'image', asset.fileName);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });

      if (res) {
        uploadFile(res.uri, 'file', res.name);
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled document picker');
      } else {
        console.error('Error picking document:', error);
        Alert.alert('Error', 'Failed to pick document.');
      }
    }
  };

  const openFile = fileUrl => {
    setSelectedFile(fileUrl);
    setIsFile(true); // Set to true if file type is selected
    setIsModalVisible(true);
  };

  const pauseAudio = async () => {
    try {
      await audioRecorderPlayer.pausePlayer();
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  // const playAudio = async fileUrl => {
  //   try {
  //     setCurrentAudio(fileUrl);
  //     await audioRecorderPlayer.startPlayer(fileUrl);
  //     audioRecorderPlayer.addPlayBackListener(e => {
  //       playbackState.currentPosition = e.currentPosition;
  //       playbackState.duration = e.duration;
  //       if (e.currentPosition === e.duration) {
  //         audioRecorderPlayer.stopPlayer();
  //         setCurrentAudio(null);
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Error playing audio:', error);
  //   }
  // };

  // const stopRecording = async () => {
  //   try {
  //     const uri = await audioRecorderPlayer.stopRecorder();
  //     setIsRecording(false);
  //     audioRecorderPlayer.removeRecordBackListener();
  //     console.log('Recording saved at:', uri);

  //     // Upload and send message
  //     await uploadFile(uri, 'audio', `audio_${Date.now()}.mp3`);
  //   } catch (error) {
  //     console.error('Error stopping recording:', error);
  //   }
  // };

  // const startRecording = async () => {
  //   try {
  //     const audioPath = Platform.select({
  //       ios: `${AudioUtils.DocumentDirectoryPath}/audio_${Date.now()}.m4a`,
  //       android: `/sdcard/audio_${Date.now()}.mp3`,
  //     });

  //     setIsRecording(true);
  //     const uri = await audioRecorderPlayer.startRecorder(audioPath);
  //     console.log('Recording started at:', uri);
  //   } catch (error) {
  //     console.error('Error starting recording:', error);
  //   }
  // };

  const prepRecording = async () => {
    setStartCountdown(false);
    try {
      // Stop the recording (for real this time)
      const result = await audioRecorderPlayer?.current?.stopRecorder();
      const fileContent = await RNFS.readFile(audioPath, 'base64');
      const fileInfo = await RNFS.stat(audioPath);
      const vnData = {
        fileCopyUri: fileInfo?.path,
        size: fileInfo?.size,
        type: 'audio/mpeg',
        name: `${generateAudioName()}.${getFileType(fileInfo?.path)}`,
      };
      const vnBase = `data:application/audio;base64,${fileContent}`;
      setAudioFile(vnData);
      setAudioBase(vnBase);
      // Now input code here to send your voicenote to websocket endpoint.
      setIsRecording(false);
    } catch (error) {
      console.log('Uh-oh! Failed to stop and send recording:', error);
    }
  };

  const playAudio = async newAudioUrl => {
    if (active === newAudioUrl) {
      try {
        if (isPlaying) {
          await SoundPlayer.pause(); // Pause the audio if already playing
          setIsPlaying(false);
        } else {
          await SoundPlayer.resume(); // Resume playing the audio if paused
          setIsPlaying(true);
        }
      } catch (error) {
        console.log(
          'Oh no! An error occurred while pausing/resuming audio:',
          error,
        );
      }
    } else {
      try {
        if (isPlaying) {
          await SoundPlayer.stop(); // Stop the currently playing audio
        }
        dispatch(setPlaying(newAudioUrl)); // Set the new audio URL
        setIsPlaying(true);
        const soundData = await SoundPlayer.getInfo();
        setTotalDuration(soundData?.duration);
        SoundPlayer.addEventListener('FinishedPlaying', () => {
          setIsPlaying(false); // Reset the playing state when audio finishes playing
          dispatch(clearPlaying(newAudioUrl));
        });
        await SoundPlayer.playUrl(newAudioUrl); // Play the new audio
        const audio = await SoundPlayer.getInfo();
        setTotalDuration(audio?.duration);
      } catch (error) {
        console.log('Oops! An error occurred while playing audio:', error);
      }
    }
  };

  const renderAudioMessage = item => {
    const isSender = item.senderId === currentUserId;
    return (
      <View
        style={[
          styles.messageContainer,
          isSender ? styles.sender : styles.receiver,
        ]}>
        <View style={styles.audioContainer}>
          <TouchableOpacity
            onPress={() =>
              currentAudio === item.fileUrl
                ? pauseAudio()
                : playAudio(item.fileUrl)
            }>
            <Icon
              name={
                currentAudio === item.fileUrl ? 'pause-circle' : 'play-circle'
              }
              size={24}
              color="#4CAF50"
            />
          </TouchableOpacity>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={playbackState.duration}
            value={playbackState.currentPosition}
            minimumTrackTintColor="#4CAF50"
            maximumTrackTintColor="#E0E0E0"
            onValueChange={value =>
              audioRecorderPlayer.seekToPlayer(Math.floor(value))
            }
          />
        </View>
      </View>
    );
  };

  const renderMessage = ({item}) => {
    const isSender = item.senderId === currentUserId;
    if (item.type === 'audio' && item.fileUrl) {
      return renderAudioMessage(item);
    }
    if (item.text) {
      return (
        <View
          style={[
            styles.messageContainer,
            isSender ? styles.sender : styles.receiver,
          ]}>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      );
    } else if (item.type === 'image' && item.fileUrl) {
      return (
        <View
          style={[
            styles.messageContainer,
            isSender ? styles.sender : styles.receiver,
          ]}>
          <TouchableOpacity onPress={() => openFile(item.fileUrl)}>
            <Image source={{uri: item.fileUrl}} style={styles.image} />
          </TouchableOpacity>
        </View>
      );
    } else if (item.type === 'file' && item.fileUrl) {
      return (
        <View
          style={[
            styles.messageContainer,
            isSender ? styles.sender : styles.receiver,
          ]}>
          <TouchableOpacity onPress={() => openFile(item.fileUrl)}>
            <Text style={styles.fileText}>
              📄 <Text style={{color: '#fff'}}>{item.fileName}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      );
    } else if (item.type === 'audio' && item.fileUrl) {
      return (
        <View
          style={[
            styles.messageContainer,
            isSender ? styles.sender : styles.receiver,
          ]}>
          <TouchableOpacity onPress={() => openFile(item.fileUrl)}>
            <Text style={styles.fileText}>🎙 Audio Message</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: `Chat with: ${otherUserName}`,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('VideoCall', {channelId})}
          style={styles.callButton}>
          <Icon name="call" size={24} color="#fff" />
        </TouchableOpacity>
      ),
      headerStyle: {backgroundColor: '#4CAF50'},
      headerTintColor: '#fff',
    });
  }, [navigation, channelId]);

  return (
    <View style={styles.container}>
      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color="#0000ff" />
          <Text>Uploading...</Text>
        </View>
      )}
      <FlatList
        data={messages}
        renderItem={renderMessage}
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
        <TouchableOpacity onPress={sendMessage}>
          <Icon name="send" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity
          onPressIn={startRecording}
          onPressOut={stopRecording}
          style={styles.recordButton}>
          <Icon
            name={isRecording ? 'mic' : 'mic-outline'}
            size={24}
            color={isRecording ? '#E53935' : '#4CAF50'}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={sendMessage}>
          <Icon name="send" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickImage}>
          <Icon name="image" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickDocument}>
          <Icon name="document" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} transparent={true}>
        <View style={styles.modalOverlay}>
          {isFile ? (
            <WebView source={{uri: selectedFile}} style={styles.webview} />
          ) : (
            <Image source={{uri: selectedFile}} style={styles.modalImage} />
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsModalVisible(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 10,
  },
  messageContainer: {
    padding: 10,
    marginBottom: 10,
    maxWidth: '70%',
    borderRadius: 10,
  },
  sender: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-end',
  },
  receiver: {
    backgroundColor: '#E0E0E0',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#fff',
  },
  fileText: {
    color: '#4CAF50',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
  },
  callButton: {
    marginRight: 15,
  },
  uploadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -50}, {translateY: -50}],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalImage: {
    width: '90%',
    height: '70%',
    borderRadius: 10,
  },
  webview: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  recordButton: {
    marginLeft: 10,
  },
});

export default ChatScreen;

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons'; // Install react-native-vector-icons

const ChatScreen = ({route}) => {
  const {channelId, otherUserName} = route.params; // Channel ID passed via navigation
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const currentUserId = auth().currentUser?.uid;
  const navigation = useNavigation();

  useEffect(() => {
    if (!currentUserId || !channelId) {
      console.error('Current user or channel ID is undefined.');
      return;
    }

    // Subscribe to messages in the selected channel
    const unsubscribe = firestore()
      .collection('channels')
      .doc(channelId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        if (!snapshot || snapshot.empty) {
          setMessages([]);
          return;
        }
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(fetchedMessages);
      });

    return unsubscribe;
  }, [currentUserId, channelId]);

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

  const initiateCall = () => {
    console.log('Call button pressed. Initiate call logic here.');
    navigation.navigate('VideoCall', {channelId: channelId});
    // Add your Agora/VoIP call integration here
  };

  const renderMessage = ({item}) => {
    const isSender = item.senderId === currentUserId;
    return (
      <View
        style={[
          styles.messageContainer,
          isSender ? styles.sender : styles.receiver,
        ]}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  // Custom header with a call button
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: `Chat with: ${otherUserName} ${channelId}`,
      headerRight: () => (
        <TouchableOpacity onPress={initiateCall} style={styles.callButton}>
          <Icon name="call" size={24} color="#fff" />
        </TouchableOpacity>
      ),
      headerStyle: {backgroundColor: '#2196F3'},
      headerTintColor: '#fff',
    });
  }, [navigation, channelId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        inverted
        renderItem={renderMessage}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={text}
          onChangeText={setText}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 10},
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: '70%',
  },
  sender: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6', // Light green
  },
  receiver: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC', // Light grey
  },
  messageText: {fontSize: 16},
  inputContainer: {flexDirection: 'row', alignItems: 'center', marginTop: 10},
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
  },
  callButton: {
    marginRight: 15,
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 20,
  },
});

export default ChatScreen;

// ChatScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('chats')
      .doc('chatRoom1') // Example chat room ID
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(fetchedMessages);
      });

    return unsubscribe;
  }, []);

  const sendMessage = async () => {
    if (text.trim() === '') return;
    await firestore()
      .collection('chats')
      .doc('chatRoom1')
      .collection('messages')
      .add({
        text,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    setText('');
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        inverted
        renderItem={({item}) => <Text style={styles.message}>{item.text}</Text>}
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
  message: {padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc'},
  inputContainer: {flexDirection: 'row', alignItems: 'center', marginTop: 10},
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
  },
});

export default ChatScreen;

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const HomeScreen = ({route, navigation}) => {
  const {uid} = route?.params; // Current user ID
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // State to track the pull-to-refresh action

  // Fetch users function moved out of useEffect so it's reusable
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      console.log('current user', currentUser);

      // Verify if user is authenticated
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to fetch users.');
        navigation.navigate('Login');
        return;
      }

      // Fetch all users from Firestore
      const usersCollection = await firestore().collection('users').get();
      console.log('usersCollection', usersCollection);
      const userList = usersCollection.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Exclude the current user from the list
      const filteredUsers = userList.filter(user => user.uid !== uid);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.code === 'firestore/permission-denied') {
        Alert.alert(
          'Permission Denied',
          'You do not have permission to fetch users. Please check your Firestore rules.',
        );
      } else {
        Alert.alert('Error', 'Unable to fetch users at the moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(); // Fetch users on initial load
  }, [uid, navigation]);

  // Function to handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true); // Start refreshing
    await fetchUsers(); // Fetch users again when pull-to-refresh is triggered
    setRefreshing(false); // End refreshing
  };

  const startChat = (otherUserId, otherUserName) => {
    // Generate a unique channel ID based on user IDs
    const channelId =
      uid < otherUserId ? `${uid}_${otherUserId}` : `${otherUserId}_${uid}`;
    navigation.navigate('Chat', {channelId, otherUserName});
  };

  const renderUserItem = ({item}) => (
    <TouchableOpacity
      style={styles.userContainer}
      onPress={() => startChat(item.uid, item.name)}>
      <Text style={styles.userName}>{item.name}</Text>
      <Text style={styles.userEmail}>{item.email}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>All Users</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderUserItem}
          ListEmptyComponent={
            <Text style={styles.noUsers}>No users found.</Text>
          }
          onRefresh={handleRefresh} // Attach the refresh handler
          refreshing={refreshing} // Indicate whether it's refreshing
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20},
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  userContainer: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  userName: {fontSize: 18, fontWeight: 'bold'},
  userEmail: {fontSize: 14, color: '#555'},
  noUsers: {textAlign: 'center', color: '#888', marginTop: 20},
});

export default HomeScreen;

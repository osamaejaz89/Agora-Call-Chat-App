import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const SignUpScreen = ({navigation}) => {
  const [name, setName] = useState(''); // State for user name
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    // Validate input fields
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Validation Error',
        'Password must be at least 6 characters long.',
      );
      return;
    }

    setLoading(true); // Start loading indicator
    try {
      // Create user in Firebase Authentication
      const response = await auth().createUserWithEmailAndPassword(
        email.trim(),
        password,
      );

      // Add user to Firestore
      await firestore().collection('users').doc(response.user.uid).set({
        uid: response.user.uid,
        email: email.trim(),
        name: name.trim(), // User-provided name
        createdAt: firestore.FieldValue.serverTimestamp(), // Optional: record creation time
      });

      console.log('Sign-Up successful:', response.user);
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully.',
      );

      // Navigate to Login screen after successful sign-up
      navigation.navigate('Login');
    } catch (error) {
      console.error('Sign-Up Error:', error);

      // Handle specific error codes
      switch (error.code) {
        case 'auth/email-already-in-use':
          Alert.alert(
            'Sign-Up Error',
            'This email address is already in use. Please try logging in.',
          );
          break;
        case 'auth/invalid-email':
          Alert.alert(
            'Sign-Up Error',
            'The email address is badly formatted. Please check and try again.',
          );
          break;
        case 'auth/weak-password':
          Alert.alert(
            'Sign-Up Error',
            'The password is too weak. Please choose a stronger password.',
          );
          break;
        default:
          Alert.alert(
            'Sign-Up Error',
            'An error occurred. Please try again later.',
          );
          break;
      }
    } finally {
      setLoading(false); // Stop loading indicator
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Sign Up" onPress={handleSignUp} />
      )}
      <Text
        style={styles.switchText}
        onPress={() => navigation.navigate('Login')}>
        Already have an account? Log In
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', padding: 20},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 20},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  switchText: {
    marginTop: 15,
    textAlign: 'center',
    color: '#007BFF',
    textDecorationLine: 'underline',
  },
});

export default SignUpScreen;

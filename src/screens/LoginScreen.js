import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import auth from '@react-native-firebase/auth';

const LoginScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validate input fields
    if (!email.trim() || !password) {
      Alert.alert('Validation Error', 'Both fields are required.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setLoading(true); // Start loading indicator
    try {
      const response = await auth().signInWithEmailAndPassword(
        email.trim(),
        password,
      );
      console.log('Login successful:', response.user);
      navigation.navigate('Home', {
        uid: response?.user?.uid,
      });
    } catch (error) {
      console.error('Login Error:', error);

      // Handle specific error codes
      switch (error.code) {
        case 'auth/invalid-email':
          Alert.alert(
            'Login Error',
            'The email address is badly formatted. Please check and try again.',
          );
          break;
        case 'auth/user-disabled':
          Alert.alert(
            'Login Error',
            'This user account has been disabled. Contact support for assistance.',
          );
          break;
        case 'auth/user-not-found':
          Alert.alert(
            'Login Error',
            'No user found with this email. Please sign up or check your credentials.',
          );
          break;
        case 'auth/wrong-password':
          Alert.alert('Login Error', 'Incorrect password. Please try again.');
          break;
        default:
          Alert.alert(
            'Login Error',
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
      <Text style={styles.title}>Login</Text>
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
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
      {/* Navigation to Sign-Up */}
      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.signUpLink}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
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
  signUpLink: {
    marginTop: 20,
    color: '#007BFF',
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontSize: 16,
  },
});

export default LoginScreen;

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Text, TextInput, TouchableOpacity } from 'react-native';
import { Button, Avatar, Card, Title, useTheme } from 'react-native-paper';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { formatDate } from '../utils/formatters';
import { UpdateProfileData } from '../types/User';
import { setAuthToken } from '../services/apiService';

// Types for our form values
type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
type WeightGoal = 'lose' | 'maintain' | 'gain';

// Helper for unit conversion
const kgToLbs = (kg: number) => (kg * 2.20462).toFixed(1);
const lbsToKg = (lbs: number) => lbs / 2.20462;
const cmToFeet = (cm: number) => Math.floor(cm / 30.48);
const cmToInches = (cm: number) => Math.round((cm / 2.54) % 12);
const feetInchesToCm = (feet: number, inches: number) => (feet * 30.48) + (inches * 2.54);

// Conditionally import DateTimePicker based on platform
let DateTimePicker: any = () => null;
if (Platform.OS !== 'web') {
  // Import for native platforms
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

// Web-compatible DatePicker component
const WebDatePicker = ({ value, onChange, maximumDate }: any) => {
  const handleChange = (e: any) => {
    if (e.target.value) {
      // Create a new date with UTC time set to noon to avoid timezone issues
      const dateStr = e.target.value; // Format: YYYY-MM-DD
      const [year, month, day] = dateStr.split('-').map(Number);

      // Create date with noon UTC time to prevent timezone shifts
      const newDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

      if (!isNaN(newDate.getTime())) {
        onChange({ type: 'set', nativeEvent: { timestamp: newDate.getTime() } }, newDate);
      }
    }
  };

  // Format date for input value
  let dateValue = '';
  try {
    if (value && !isNaN(new Date(value).getTime())) {
      // Use UTC methods to get consistent date representation
      const date = new Date(value);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      dateValue = `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('Error formatting date:', error);
  }

  // Format max date if provided
  let maxDate = '';
  try {
    if (maximumDate && !isNaN(new Date(maximumDate).getTime())) {
      const date = new Date(maximumDate);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      maxDate = `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('Error formatting max date:', error);
  }

  return (
    <input
      type="date"
      value={dateValue}
      onChange={handleChange}
      max={maxDate}
      style={{
        padding: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#ccc',
        borderStyle: 'solid',
        fontSize: 16,
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  );
};

// Near the top, add this helper function for platform detection
const isWeb = Platform.OS === 'web';

const EditProfileScreen: React.FC = () => {
  const { user, token, updateUserData } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();

  // Set token for API calls
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  // Fetch fresh profile data when component mounts
  useEffect(() => {
    const fetchLatestProfileData = async () => {
      try {
        const result = await userService.getProfile();

        if (result && result.user) {
          // Update the user data in context
          await updateUserData({
            name: result.user.name,
            gender: result.user.gender,
            birthdate: result.user.birthdate,
            weight: result.user.weight,
            height: result.user.height,
            activityLevel: result.user.activityLevel,
            weightGoal: result.user.weightGoal,
            profilePicture: result.user.profilePicture
          });

          // Update local state with new data
          setName(result.user.name || '');
          setGender(result.user.gender || '');
          setBirthdate(result.user.birthdate ? new Date(result.user.birthdate) : undefined);
          setWeightLbs(result.user.weight ? kgToLbs(result.user.weight) : '');
          setHeightFeet(result.user.height ? cmToFeet(result.user.height).toString() : '');
          setHeightInches(result.user.height ? cmToInches(result.user.height).toString() : '');
          setActivityLevel(result.user.activityLevel as ActivityLevel || '');
          setWeightGoal(result.user.weightGoal as WeightGoal || '');
          setProfilePicture(result.user.profilePicture || '');
        }
      } catch (error) {
        console.error('Error fetching latest profile data:', error);
        // Don't show alert to user - just fall back to stored data
      }
    };

    fetchLatestProfileData();
  }, []); // Empty dependency array means this runs once when component mounts

  // Form state
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState<Gender | ''>(user?.gender || '');
  const [birthdate, setBirthdate] = useState<Date | undefined>(
    user?.birthdate ? new Date(user.birthdate) : undefined
  );

  // Imperial units state
  const [weightLbs, setWeightLbs] = useState(
    user?.weight ? kgToLbs(user.weight) : ''
  );
  const [heightFeet, setHeightFeet] = useState(
    user?.height ? cmToFeet(user.height).toString() : ''
  );
  const [heightInches, setHeightInches] = useState(
    user?.height ? cmToInches(user.height).toString() : ''
  );

  const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>(user?.activityLevel as ActivityLevel || '');
  const [weightGoal, setWeightGoal] = useState<WeightGoal | ''>(user?.weightGoal as WeightGoal || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [showWeightGoalPicker, setShowWeightGoalPicker] = useState(false);

  const handleSubmit = async () => {
    // Form validation
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (weightLbs && isNaN(parseFloat(weightLbs))) newErrors.weight = 'Weight must be a number';
    if ((heightFeet && isNaN(parseFloat(heightFeet))) ||
        (heightInches && isNaN(parseFloat(heightInches)))) {
      newErrors.height = 'Height must be a number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      // Convert imperial to metric for API
      const weight = weightLbs ? lbsToKg(parseFloat(weightLbs)) : undefined;
      const height = (heightFeet && heightInches)
        ? feetInchesToCm(parseFloat(heightFeet), parseFloat(heightInches))
        : undefined;

      // Format date in ISO format but preserve the selected day
      let birthdateStr: string | undefined = undefined;
      if (birthdate) {
        // Use UTC methods to prevent timezone shift
        const year = birthdate.getUTCFullYear();
        const month = String(birthdate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(birthdate.getUTCDate()).padStart(2, '0');
        birthdateStr = `${year}-${month}-${day}`;
      }

      const updatedData: UpdateProfileData = {
        name,
        gender: gender || undefined,
        birthdate: birthdateStr,
        weight,
        height,
        activity_level: activityLevel || undefined,
        weight_goal: weightGoal || undefined,
        profile_picture: profilePicture || undefined
      };

      const result = await userService.updateProfile(updatedData);

      if (result && result.user) {
        // Update the user in the global context
        await updateUserData({
          name: result.user.name,
          gender: result.user.gender,
          birthdate: result.user.birthdate,
          weight: result.user.weight,
          height: result.user.height,
          activityLevel: result.user.activityLevel,
          weightGoal: result.user.weightGoal,
          profilePicture: result.user.profilePicture
        });

        Alert.alert('Success', 'Profile updated successfully');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Normalize the date to noon UTC to avoid timezone issues
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      const normalizedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
      setBirthdate(normalizedDate);
    }
  };

  // Render date picker based on platform
  const renderDatePicker = () => {
    if (Platform.OS === 'web') {
      return (
        <WebDatePicker
          value={birthdate || new Date()}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      );
    } else if (showDatePicker) {
      return (
        <DateTimePicker
          value={birthdate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      );
    }
    return null;
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'You need to allow access to your photos to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // In a real app, you would upload this to your server
      setProfilePicture(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      {/* Only show overlay on native platforms */}
      {!isWeb && (showGenderPicker || showActivityPicker || showWeightGoalPicker) && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={0}
          onPress={() => {
            setShowGenderPicker(false);
            setShowActivityPicker(false);
            setShowWeightGoalPicker(false);
          }}
        />
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.profilePictureCard}>
          <TouchableOpacity onPress={pickImage}>
            <View style={styles.profilePictureContainer}>
              {profilePicture ? (
                <Avatar.Image
                  source={{ uri: profilePicture }}
                  size={100}
                  style={styles.profilePicture}
                />
              ) : (
                <Avatar.Icon
                  icon="account"
                  size={100}
                  style={[styles.profilePicture, { backgroundColor: theme.colors.primary }]}
                />
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={24} color="white" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </Card>

        <Card style={[styles.formCard, { zIndex: showGenderPicker ? 5 : 3 }]}>
          <Card.Content>
            <Title>Personal Information</Title>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={[styles.input, errors.name ? styles.inputError : null]}
                placeholder="Your name"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.label}>Gender</Text>
                {isWeb ? (
                  <View style={styles.webSelectContainer}>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender)}
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: '#ddd',
                        fontSize: 16,
                        height: 40,
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </View>
                ) : (
                  <>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setShowGenderPicker(!showGenderPicker);
                        setShowActivityPicker(false);
                        setShowWeightGoalPicker(false);
                      }}
                      style={styles.selectButton}
                    >
                      {gender
                        ? gender === 'prefer_not_to_say'
                          ? 'Prefer not to say'
                          : gender.charAt(0).toUpperCase() + gender.slice(1)
                        : 'Select gender'}
                    </Button>

                    {showGenderPicker && (
                      <Card style={styles.optionsCard}>
                        <Button mode="text" onPress={() => { setGender('male'); setShowGenderPicker(false); }}>
                          Male
                        </Button>
                        <Button mode="text" onPress={() => { setGender('female'); setShowGenderPicker(false); }}>
                          Female
                        </Button>
                        <Button mode="text" onPress={() => { setGender('other'); setShowGenderPicker(false); }}>
                          Other
                        </Button>
                        <Button mode="text" onPress={() => { setGender('prefer_not_to_say'); setShowGenderPicker(false); }}>
                          Prefer not to say
                        </Button>
                      </Card>
                    )}
                  </>
                )}
              </View>

              <View style={styles.formColumn}>
                <Text style={styles.label}>Date of Birth</Text>
                {Platform.OS === 'web' ? (
                  renderDatePicker()
                ) : (
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <View style={styles.dateDisplay}>
                      <Text>{birthdate ? formatDate(birthdate) : 'Not set'}</Text>
                      <Ionicons name="calendar" size={24} color={theme.colors.primary} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {Platform.OS !== 'web' && renderDatePicker()}
          </Card.Content>
        </Card>

        <Card style={[styles.formCard, { zIndex: (showActivityPicker || showWeightGoalPicker) ? 5 : 2 }]}>
          <Card.Content>
            <Title>Body Metrics</Title>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Weight (lbs)</Text>
              <TextInput
                value={weightLbs}
                onChangeText={setWeightLbs}
                keyboardType="numeric"
                style={[styles.input, errors.weight ? styles.inputError : null]}
                placeholder="Your weight in pounds"
              />
              {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formColumn, { width: '45%' }]}>
                <Text style={styles.label}>Height (ft)</Text>
                <TextInput
                  value={heightFeet}
                  onChangeText={setHeightFeet}
                  keyboardType="numeric"
                  style={[styles.input, errors.height ? styles.inputError : null]}
                  placeholder="Feet"
                />
              </View>
              <View style={[styles.formColumn, { width: '45%' }]}>
                <Text style={styles.label}>Height (in)</Text>
                <TextInput
                  value={heightInches}
                  onChangeText={setHeightInches}
                  keyboardType="numeric"
                  style={[styles.input, errors.height ? styles.inputError : null]}
                  placeholder="Inches"
                />
              </View>
            </View>
            {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}

            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Activity Level</Text>
              {isWeb ? (
                <View style={styles.webSelectContainer}>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: '#ddd',
                      fontSize: 16,
                      height: 40,
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">Select activity level</option>
                    <option value="sedentary">Sedentary</option>
                    <option value="lightly_active">Lightly Active</option>
                    <option value="moderately_active">Moderately Active</option>
                    <option value="very_active">Very Active</option>
                    <option value="extremely_active">Extremely Active</option>
                  </select>
                </View>
              ) : (
                <>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setShowGenderPicker(false);
                      setShowWeightGoalPicker(false);
                      setShowActivityPicker(!showActivityPicker);
                    }}
                    style={styles.selectButton}
                  >
                    {activityLevel
                      ? activityLevel.replace(/_/g, ' ')
                            .split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')
                      : 'Select activity level'}
                  </Button>

                  {showActivityPicker && (
                    <Card style={styles.optionsCard}>
                      <Button mode="text" onPress={() => { setActivityLevel('sedentary'); setShowActivityPicker(false); }}>
                        Sedentary
                      </Button>
                      <Button mode="text" onPress={() => { setActivityLevel('lightly_active'); setShowActivityPicker(false); }}>
                        Lightly Active
                      </Button>
                      <Button mode="text" onPress={() => { setActivityLevel('moderately_active'); setShowActivityPicker(false); }}>
                        Moderately Active
                      </Button>
                      <Button mode="text" onPress={() => { setActivityLevel('very_active'); setShowActivityPicker(false); }}>
                        Very Active
                      </Button>
                      <Button mode="text" onPress={() => { setActivityLevel('extremely_active'); setShowActivityPicker(false); }}>
                        Extremely Active
                      </Button>
                    </Card>
                  )}
                </>
              )}
            </View>

            <View style={[styles.pickerContainer, { zIndex: 3 }]}>
              <Text style={styles.label}>Weight Goal</Text>
              {isWeb ? (
                <View style={styles.webSelectContainer}>
                  <select
                    value={weightGoal}
                    onChange={(e) => setWeightGoal(e.target.value as WeightGoal)}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: '#ddd',
                      fontSize: 16,
                      height: 40,
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">Select weight goal</option>
                    <option value="lose">Lose Weight</option>
                    <option value="maintain">Maintain Weight</option>
                    <option value="gain">Gain Weight</option>
                  </select>
                </View>
              ) : (
                <>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setShowGenderPicker(false);
                      setShowActivityPicker(false);
                      setShowWeightGoalPicker(!showWeightGoalPicker);
                    }}
                    style={styles.selectButton}
                  >
                    {weightGoal === 'lose'
                      ? 'Lose Weight'
                      : weightGoal === 'maintain'
                        ? 'Maintain Weight'
                        : weightGoal === 'gain'
                          ? 'Gain Weight'
                          : 'Select weight goal'}
                  </Button>

                  {showWeightGoalPicker && (
                    <Card style={styles.optionsCard}>
                      <Button mode="text" onPress={() => { setWeightGoal('lose'); setShowWeightGoalPicker(false); }}>
                        Lose Weight
                      </Button>
                      <Button mode="text" onPress={() => { setWeightGoal('maintain'); setShowWeightGoalPicker(false); }}>
                        Maintain Weight
                      </Button>
                      <Button mode="text" onPress={() => { setWeightGoal('gain'); setShowWeightGoalPicker(false); }}>
                        Gain Weight
                      </Button>
                    </Card>
                  )}
                </>
              )}
            </View>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
            disabled={loading}
            loading={loading}
          >
            Save Changes
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.button}
            disabled={loading}
          >
            Cancel
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  scrollContent: {
    padding: 16,
  },
  profilePictureCard: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
  },
  profilePictureContainer: {
    position: 'relative',
  },
  profilePicture: {
    marginBottom: 8,
  },
  cameraIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#007bff',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    marginTop: 8,
    color: '#007bff',
  },
  formCard: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 3,
    borderRadius: 8,
    backgroundColor: 'white',
    elevation: 2,
    overflow: 'hidden',
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: 'red',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    zIndex: 5,
    position: 'relative',
  },
  formColumn: {
    width: '48%',
    position: 'relative',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#333',
  },
  pickerContainer: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: 'white',
  },
  pickerOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  buttonContainer: {
    marginVertical: 20,
  },
  button: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  errorText: {
    color: 'red',
    marginTop: 4,
  },
  dateDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: 'white',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  selectButton: {
    borderColor: '#e0e0e0',
    borderWidth: 1,
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginBottom: 4,
    backgroundColor: 'white',
  },
  optionsCard: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    zIndex: 2000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderRadius: 4,
  },
  webSelectContainer: {
    marginBottom: 8,
  },
});

export default EditProfileScreen;
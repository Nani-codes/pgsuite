import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export function LoginScreen() {
  const { login, register, isLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [sending, setSending] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Please enter a valid phone number' });
      return;
    }
    setSending(true);
    try {
      await api.auth.sendOtp(phone);
      setStep('otp');
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'OTP Failed', text2: err.message || 'Failed to send OTP' });
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const result = await login(phone, otp);
      if (result && result.isNewUser) {
        setStep('register');
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: err.message || 'Invalid OTP' });
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Name Required', text2: 'Name is required to register' });
      return;
    }
    try {
      await register(phone, name.trim(), email.trim() || undefined);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: err.message || 'Registration failed' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="business" size={40} color={colors.white} />
          </View>
          <Text style={styles.appName}>PG Manager</Text>
          <Text style={styles.tagline}>
            Smart PG management for owners & tenants
          </Text>
        </View>

        <View style={styles.formCard}>
          {step === 'phone' ? (
            <>
              <Text style={styles.formTitle}>Welcome</Text>
              <Text style={styles.formSubtitle}>
                We'll send you an SMS verification code
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="9876543210"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>
              <Button
                title="Send OTP"
                onPress={handleSendOtp}
                loading={sending}
                size="lg"
                style={{ marginTop: 8 }}
              />

            </>
          ) : step === 'otp' ? (
            <>
              <Text style={styles.formTitle}>Verify OTP</Text>
              <Text style={styles.formSubtitle}>
                Enter the 6-digit code sent to +91 {phone}
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>OTP Code</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="123456"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor={colors.textLight}
                />
              </View>
              <Button
                title="Verify & Login"
                onPress={handleVerifyOtp}
                loading={isLoading}
                size="lg"
                style={{ marginTop: 8 }}
              />
              <Button
                title="Change Number"
                onPress={() => {
                  setStep('phone');
                  setOtp('');
                }}
                variant="outline"
                size="sm"
                style={{ marginTop: 12 }}
              />
            </>
          ) : (
            <>
              <Text style={styles.formTitle}>Complete Profile</Text>
              <Text style={styles.formSubtitle}>
                Looks like you're new! Let's get you set up as an Owner.
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="John Doe"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="john@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <Button
                title="Create Account"
                onPress={handleRegister}
                loading={isLoading}
                size="lg"
                style={{ marginTop: 8 }}
              />
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCode: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    letterSpacing: 1,
  },
  otpInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    letterSpacing: 8,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

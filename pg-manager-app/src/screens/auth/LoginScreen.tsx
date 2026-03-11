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
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [sending, setSending] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    setSending(true);
    try {
      await api.auth.sendOtp(phone);
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await login(phone, otp);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Invalid OTP');
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
                Enter your phone number to get started
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
              <Text style={styles.hint}>
                Dev mode: Use 9876543210 (owner) or 9123456789 (tenant)
              </Text>
            </>
          ) : (
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
              <Text style={styles.hint}>Dev mode: OTP is always 123456</Text>
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
  hint: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

import { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/providers/AuthProvider';
import { useCreatePost } from '@/hooks/useCreatePost';
import { pickAndCompressImage, uploadPostImage } from '@/lib/postImageUpload';
import { ApiRequestError } from '@/lib/api';
import { colors } from '@/theme/colors';

export default function CreatePostScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { mutateAsync: createPost } = useCreatePost(session);

  const [body, setBody] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = (body.trim().length > 0 || imageUri != null) && !submitting;

  async function handlePickImage() {
    try {
      const uri = await pickAndCompressImage();
      if (uri) setImageUri(uri);
    } catch {
      Alert.alert('Error', 'Could not open your photo library.');
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const image_url = imageUri ? await uploadPostImage(imageUri) : undefined;
      await createPost({ body: body.trim() || undefined, image_url });
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiRequestError ? err.message : 'Could not create post.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={handleSubmit} disabled={!canSubmit} hitSlop={8} className="pr-md">
              {submitting ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text
                  className={`font-sans-bold ${canSubmit ? 'text-primary' : 'text-text-muted/40'}`}
                >
                  Post
                </Text>
              )}
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="flex-1 gap-md px-lg py-md">
            <TextInput
              className="min-h-32 font-sans text-body-md text-text-main"
              placeholder="What's happening at the gym?"
              placeholderTextColor="rgba(148,163,184,0.4)"
              value={body}
              onChangeText={setBody}
              multiline
              autoFocus
            />

            {imageUri ? (
              <View className="relative">
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', aspectRatio: 1, borderRadius: 8 }}
                  contentFit="cover"
                />
                <Pressable
                  onPress={() => setImageUri(null)}
                  className="absolute right-sm top-sm rounded-full bg-background/80 p-xs"
                >
                  <Icon name="close" size={18} color={colors.textMain} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handlePickImage}
                className="flex-row items-center gap-sm rounded-md border border-white/10 bg-surface-container-low px-md py-md active:opacity-90"
              >
                <Icon name="image" size={20} color={colors.textMuted} />
                <Text className="font-sans-semibold text-text-main">Add Photo</Text>
              </Pressable>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

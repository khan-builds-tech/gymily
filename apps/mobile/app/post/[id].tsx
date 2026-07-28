import { useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { PostComment } from '@gymily/types';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/providers/AuthProvider';
import { usePost, useIsPostLikedByMe } from '@/hooks/usePost';
import { usePostComments } from '@/hooks/usePostComments';
import { useAddComment, useDeleteComment } from '@/hooks/useCommentMutations';
import { useToggleLike } from '@/hooks/useToggleLike';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { colors } from '@/theme/colors';

function CommentRow({
  comment,
  onPressAuthor,
  onDelete,
}: {
  comment: PostComment;
  onPressAuthor: () => void;
  onDelete?: () => void;
}) {
  return (
    <View className="flex-row items-start gap-sm px-lg py-sm">
      <Pressable onPress={onPressAuthor} hitSlop={8}>
        <Icon name="person" size={18} color={colors.textMuted} />
      </Pressable>
      <Pressable onPress={onPressAuthor} className="flex-1">
        <Text variant="body-sm" className="text-text-muted/70">
          @{comment.author_username}
        </Text>
        <Text variant="body">{comment.body}</Text>
      </Pressable>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={8}>
          <Icon name="close" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id;

  const { data: post, isLoading: postLoading } = usePost(id);
  const { data: likedByMe } = useIsPostLikedByMe(id, session);
  const { data: comments, isLoading: commentsLoading } = usePostComments(id);
  const { mutate: toggleLike } = useToggleLike(session);
  const { mutate: addComment, isPending: addingComment } = useAddComment(id, session);
  const { mutate: deleteComment } = useDeleteComment(id, session);

  const [commentBody, setCommentBody] = useState('');
  const [deletingPost, setDeletingPost] = useState(false);

  function handleSubmitComment() {
    const body = commentBody.trim();
    if (!body) return;
    addComment(body, { onSuccess: () => setCommentBody('') });
  }

  function confirmDeletePost() {
    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingPost(true);
          try {
            await apiFetch(`/api/posts/${id}`, { method: 'DELETE' });
            router.back();
          } catch (err) {
            Alert.alert('Error', err instanceof ApiRequestError ? err.message : 'Could not delete post.');
          } finally {
            setDeletingPost(false);
          }
        },
      },
    ]);
  }

  if (postLoading || !post) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" edges={['bottom']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const isOwnPost = post.author_id === myId;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={comments ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View className="gap-sm px-lg py-md">
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => router.push(`/user/${post.author.username}`)}
                  className="flex-row items-center gap-sm active:opacity-70"
                >
                  <Icon name="person" size={20} color={colors.textMuted} />
                  <View>
                    <Text className="font-sans-semibold text-text-main">{post.author.full_name}</Text>
                    <Text variant="body-sm" className="text-text-muted/70">
                      @{post.author.username}
                    </Text>
                  </View>
                </Pressable>
                {isOwnPost ? (
                  <Pressable onPress={confirmDeletePost} disabled={deletingPost} hitSlop={8}>
                    <Icon name="delete-outline" size={20} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              {post.body ? <Text variant="body">{post.body}</Text> : null}

              {post.image_url ? (
                <Image
                  source={{ uri: post.image_url }}
                  style={{ width: '100%', aspectRatio: 1, borderRadius: 8 }}
                  contentFit="cover"
                />
              ) : null}

              <View className="flex-row items-center gap-lg pt-xs">
                <Pressable
                  onPress={() => toggleLike({ postId: id, liked: likedByMe ?? false })}
                  className="flex-row items-center gap-xs active:opacity-70"
                >
                  <Icon
                    name={likedByMe ? 'favorite' : 'favorite-border'}
                    size={18}
                    color={likedByMe ? colors.cultPink : colors.textMuted}
                  />
                  <Text variant="body-sm">{post.like_count}</Text>
                </Pressable>
                <View className="flex-row items-center gap-xs">
                  <Icon name="chat-bubble-outline" size={18} color={colors.textMuted} />
                  <Text variant="body-sm">{post.comment_count}</Text>
                </View>
              </View>

              <View className="mt-sm border-t border-white/10" />
            </View>
          }
          renderItem={({ item }) => (
            <CommentRow
              comment={item}
              onPressAuthor={() => router.push(`/user/${item.author_username}`)}
              onDelete={item.author_id === myId ? () => deleteComment(item.id) : undefined}
            />
          )}
          ListEmptyComponent={
            !commentsLoading ? (
              <Text variant="body-sm" className="px-lg text-text-muted/60">
                No comments yet.
              </Text>
            ) : null
          }
        />

        <View className="flex-row items-end gap-sm border-t border-white/10 px-lg py-sm">
          <TextInput
            className="max-h-24 flex-1 rounded-md border border-white/10 bg-surface-container-low px-md py-sm font-sans text-body-md text-text-main"
            placeholder="Add a comment"
            placeholderTextColor="rgba(148,163,184,0.4)"
            value={commentBody}
            onChangeText={setCommentBody}
            multiline
          />
          <Button
            label="Post"
            loading={addingComment}
            disabled={!commentBody.trim()}
            onPress={handleSubmitComment}
            className="px-md"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

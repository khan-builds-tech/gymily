import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { FeedPost } from '@gymily/types';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/providers/AuthProvider';
import { useFeed } from '@/hooks/useFeed';
import { useToggleLike } from '@/hooks/useToggleLike';
import { colors } from '@/theme/colors';

function PostCard({
  post,
  onPress,
  onToggleLike,
}: {
  post: FeedPost;
  onPress: () => void;
  onToggleLike: (post: FeedPost) => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="gap-sm rounded-md border border-white/10 bg-surface-container-low px-md py-md active:opacity-90"
    >
      <View className="flex-row items-center gap-sm">
        <Icon name="person" size={20} color={colors.textMuted} />
        <View>
          <Text className="font-sans-semibold text-text-main">{post.author_full_name}</Text>
          <Text variant="body-sm" className="text-text-muted/70">
            @{post.author_username}
          </Text>
        </View>
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
          onPress={() => onToggleLike(post)}
          hitSlop={8}
          className="flex-row items-center gap-xs active:opacity-70"
        >
          <Icon
            name={post.liked_by_me ? 'favorite' : 'favorite-border'}
            size={18}
            color={post.liked_by_me ? colors.cultPink : colors.textMuted}
          />
          <Text variant="body-sm">{post.like_count}</Text>
        </Pressable>
        <View className="flex-row items-center gap-xs">
          <Icon name="chat-bubble-outline" size={18} color={colors.textMuted} />
          <Text variant="body-sm">{post.comment_count}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Feed tab — every post, newest first (get_feed RPC). */
export default function FeedScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, isRefetching } =
    useFeed(session);
  const { mutate: toggleLike } = useToggleLike(session);

  const posts = data?.pages.flat() ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-lg py-md">
        <Text variant="editorial-lg">Feed</Text>
        <Pressable onPress={() => router.push('/post/create')} hitSlop={8}>
          <Icon name="add-circle-outline" size={28} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-sm px-lg pb-md"
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => router.push(`/post/${item.id}`)}
              onToggleLike={(post) => toggleLike({ postId: post.id, liked: post.liked_by_me })}
            />
          )}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-md">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text variant="body-sm" className="px-lg text-center text-text-muted/60">
              No posts yet. Once someone posts, it&apos;ll show up here.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

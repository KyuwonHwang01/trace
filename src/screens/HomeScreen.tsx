import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing, text, fonts } from '../theme/colors';
import { addFolder, loadTopLevelFolders } from '../storage/folders';
import { addProject, deleteProject, loadStandaloneProjects } from '../storage/projects';
import { deletePhotosForProjects } from '../storage/photos';
import { deleteFolderCascade } from '../storage/cascade';
import { Folder, Project } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { useTranslation, formatRelative } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type HomeItem =
  | { kind: 'folder'; folder: Folder; createdAt: number }
  | { kind: 'project'; project: Project; createdAt: number };

type CreateMode = 'folder' | 'project';

export default function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [chooseVisible, setChooseVisible] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode | null>(null);
  const [newName, setNewName] = useState('');

  const refresh = useCallback(async () => {
    const [fs, ps] = await Promise.all([loadTopLevelFolders(), loadStandaloneProjects()]);
    setFolders(fs);
    setProjects(ps);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const items: HomeItem[] = [
    ...folders.map<HomeItem>((f) => ({ kind: 'folder', folder: f, createdAt: f.createdAt })),
    ...projects.map<HomeItem>((p) => ({ kind: 'project', project: p, createdAt: p.createdAt })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  const openCreate = (mode: CreateMode) => {
    setChooseVisible(false);
    setCreateMode(mode);
    setNewName('');
  };

  const closeCreate = () => {
    setCreateMode(null);
    setNewName('');
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !createMode) return;
    if (createMode === 'folder') {
      await addFolder(trimmed);
    } else {
      await addProject(trimmed);
    }
    closeCreate();
    refresh();
  };

  const handleLongPressFolder = (folder: Folder) => {
    Alert.alert(t('home.deleteAlert.title'), t('home.deleteAlert.body', { name: folder.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteFolderCascade(folder.id);
          refresh();
        },
      },
    ]);
  };

  const handleLongPressProject = (project: Project) => {
    Alert.alert(
      t('folder.deleteAlert.title'),
      t('folder.deleteAlert.body', { name: project.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteProject(project.id);
            await deletePhotosForProjects([project.id]);
            refresh();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: HomeItem }) => {
    if (item.kind === 'folder') {
      const f = item.folder;
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('FolderDetail', { folderId: f.id })}
          onLongPress={() => handleLongPressFolder(f)}
        >
          <View style={styles.cover}>
            {f.coverPhotoUri ? (
              <Image
                source={{ uri: f.coverPhotoUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <Feather name="folder" size={20} color={colors.textSubtle} />
            )}
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Feather
                name="folder"
                size={12}
                color={colors.accent}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {f.name}
              </Text>
            </View>
            <Text style={styles.cardMeta}>
              {f.projectCount > 0
                ? t('home.card.meta.withProjects', {
                    count: f.projectCount,
                    when: formatRelative(f.createdAt, t),
                  })
                : t('home.card.meta.empty', { when: formatRelative(f.createdAt, t) })}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textSubtle} />
        </TouchableOpacity>
      );
    }
    const p = item.project;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id })}
        onLongPress={() => handleLongPressProject(p)}
      >
        <View style={styles.cover}>
          {p.coverPhotoUri ? (
            <Image
              source={{ uri: p.coverPhotoUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Feather name="image" size={20} color={colors.textSubtle} />
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={styles.cardMeta}>
            {p.photoCount > 0
              ? t('folder.card.meta.withPhotos', {
                  count: p.photoCount,
                  when: formatRelative(p.createdAt, t),
                })
              : t('folder.card.meta.empty', { when: formatRelative(p.createdAt, t) })}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.textSubtle} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>{t('home.brand')}</Text>
            <Text style={styles.tagline}>{t('home.tagline')}</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsBtn}
            hitSlop={12}
          >
            <Feather name="settings" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) =>
          item.kind === 'folder' ? `f-${item.folder.id}` : `p-${item.project.id}`
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="folder" size={28} color={colors.textSubtle} />
            </View>
            <Text style={styles.emptyTitle}>{t('home.empty.title')}</Text>
            <Text style={styles.emptyBody}>{t('home.empty.body')}</Text>
          </View>
        }
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setChooseVisible(true)}
      >
        <Feather name="plus" size={26} color={colors.white} />
      </Pressable>

      <Modal
        visible={chooseVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChooseVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setChooseVisible(false)}>
          <Pressable style={styles.chooseCard} onPress={() => {}}>
            <Text style={styles.chooseTitle}>{t('create.title')}</Text>

            <Pressable
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={() => openCreate('folder')}
            >
              <View style={styles.optionIcon}>
                <Feather name="folder" size={22} color={colors.accent} />
              </View>
              <View style={styles.optionMeta}>
                <Text style={styles.optionTitle}>{t('create.option.folder.title')}</Text>
                <Text style={styles.optionBody}>{t('create.option.folder.subtitle')}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textSubtle} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={() => openCreate('project')}
            >
              <View style={styles.optionIcon}>
                <Feather name="image" size={22} color={colors.accent} />
              </View>
              <View style={styles.optionMeta}>
                <Text style={styles.optionTitle}>{t('create.option.project.title')}</Text>
                <Text style={styles.optionBody}>{t('create.option.project.subtitle')}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textSubtle} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={createMode !== null}
        transparent
        animationType="fade"
        onRequestClose={closeCreate}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeCreate}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalEyebrow}>
              {createMode === 'folder'
                ? t('home.modal.eyebrow')
                : t('folder.modal.eyebrow')}
            </Text>
            <Text style={styles.modalTitle}>
              {createMode === 'folder' ? t('home.modal.title') : t('folder.modal.title')}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                createMode === 'folder'
                  ? t('home.modal.placeholder')
                  : t('folder.modal.placeholder')
              }
              placeholderTextColor={colors.textSubtle}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnGhost} onPress={closeCreate}>
                <Text style={styles.modalBtnGhostText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleCreate}>
                <Text style={styles.modalBtnPrimaryText}>
                  {createMode === 'folder'
                    ? t('home.modal.create')
                    : t('folder.modal.create')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg + spacing.xs,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: fonts.serifBold,
    fontSize: 44,
    color: '#FD696A',
    letterSpacing: -0.8,
    lineHeight: 48,
  },
  tagline: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 140,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    ...text.heading,
    color: colors.text,
    flex: 1,
  },
  cardMeta: {
    ...text.meta,
    color: colors.textMuted,
    marginTop: 3,
  },
  empty: {
    paddingTop: spacing.xxl + spacing.lg,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...text.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    ...text.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  chooseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chooseTitle: {
    ...text.caption,
    color: colors.accent,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  optionPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionMeta: {
    flex: 1,
  },
  optionTitle: {
    ...text.bodyMedium,
    color: colors.text,
    fontSize: 16,
  },
  optionBody: {
    ...text.meta,
    color: colors.textMuted,
    marginTop: 2,
  },

  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalEyebrow: {
    ...text.caption,
    color: colors.accent,
    marginBottom: 6,
  },
  modalTitle: {
    ...text.title,
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...text.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  modalBtnGhost: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  modalBtnGhostText: {
    ...text.button,
    color: colors.textMuted,
  },
  modalBtnPrimary: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  modalBtnPrimaryText: {
    ...text.button,
    color: colors.white,
  },
});

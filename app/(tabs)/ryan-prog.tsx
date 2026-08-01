// ÉCRAN RYAN-PROG — RyanTask's
// Mémos d'achats + galerie images + liens

import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Linking, Image, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { useTaskStore } from '../../store/taskStore'
import { authRepository } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import { ProgItem, ProgLink, LinkPlatform } from '../../types'
import ProgFormModal from '../../components/ProgFormModal'
import ProgDetailModal from '../../components/ProgDetailModal'
import { SyncEngine } from '../../lib/sync/SyncEngine'
import { isOnline } from '../../lib/sync/NetworkDetector'
import { buildWhatsAppUrl, normalizeLinkUrl } from '../../lib/linkDetector'
import SyncBadge from '../../components/SyncBadge'

// LOGOS SVG RÉELS DES PLATEFORMES

const WhatsAppIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="#25D366">
    <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <Path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.522 5.847L.057 23.428a.75.75 0 00.921.921l5.579-1.465A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.5-5.2-1.373l-.374-.217-3.873 1.016 1.016-3.873-.217-.374A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </Svg>
)

const InstagramIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="#F472B6">
    <Path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </Svg>
)

const FacebookIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="#60A5FA">
    <Path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </Svg>
)

const TikTokIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill={Colors.cyan}>
    <Path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </Svg>
)


// CONFIG PLATEFORMES

type PlatformConfig = {
  label: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
}

const getPlatformConfig = (): Record<string, PlatformConfig> => ({
  whatsapp: {
    label: 'WhatsApp', color: '#25D366',
    bg: 'rgba(37,211,102,0.12)', border: 'rgba(37,211,102,0.25)',
    icon: <WhatsAppIcon />,
  },
  instagram: {
    label: 'Instagram', color: '#F472B6',
    bg: 'rgba(214,40,132,0.12)', border: 'rgba(214,40,132,0.25)',
    icon: <InstagramIcon />,
  },
  facebook: {
    label: 'Facebook', color: '#60A5FA',
    bg: 'rgba(24,119,242,0.12)', border: 'rgba(24,119,242,0.25)',
    icon: <FacebookIcon />,
  },
  tiktok: {
    label: 'TikTok', color: Colors.cyan,
    bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.25)',
    icon: <TikTokIcon />,
  },
  web: {
    label: 'Lien', color: Colors.text2,
    bg: 'rgba(255,255,255,0.06)', border: Colors.border,
    icon: <Text style={{ fontSize: 12 }}>🔗</Text>,
  },
})

// SCREEN PRINCIPAL

function normalizeSearchValue(value: string | number | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function RyanProgScreen() {
  const { progItems, fetchProgItems, updateProgItem, deleteProgItem, addProgItem, searchProgItems } = useTaskStore()
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<ProgItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ProgItem | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)

  useEffect(() => {
    authRepository.getUser().then(user => {
      if (user) {
        setUserId(user.id)
        useTaskStore.getState().setUserId(user.id)
        fetchProgItems(user.id)
      }
    })
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    const online = await isOnline()
    if (online) await SyncEngine.sync()
    if (userId) await fetchProgItems(userId)
    setRefreshing(false)
  }

  const searchQuery = normalizeSearchValue(search.trim())

  useEffect(() => {
    let cancelled = false

    const runSearch = async () => {
      if (!searchQuery) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      try {
        const results = await searchProgItems(searchQuery)
        if (!cancelled) {
          setSearchResults(results)
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false)
        }
      }
    }

    runSearch()

    return () => {
      cancelled = true
    }
  }, [searchQuery, searchProgItems])

  const visibleProgItems = useMemo(() => {
    if (!searchQuery) return progItems
    return searchResults
  }, [progItems, searchQuery, searchResults])

  const enAttente = visibleProgItems.filter(p => p.status === 'en_attente').length
  const achete = visibleProgItems.filter(p => p.status === 'achete').length
  const visibleEnAttente = visibleProgItems.filter(p => p.status === 'en_attente').length
  const visibleAchete = visibleProgItems.filter(p => p.status === 'achete').length

  const handleCreateProgItem = async (data: {
    name: string
    price: number | null
    currency: string
    phone: string | null
    address: string | null
    note: string | null
    links: { url: string; platform: LinkPlatform }[]
  }) => {
    if (!userId) return

    // Crée via Repository — SQLite d'abord, Supabase ensuite
    const newItem = await addProgItem({
      user_id: userId,
      name: data.name,
      price: data.price,
      currency: data.currency,
      phone: data.phone,
      address: data.address,
      note: data.note,
      photo_url: null,
      status: 'en_attente',
      links: data.links.map((link, i) => ({
        id: `local_${i}`,
        prog_item_id: '',
        url: link.url,
        platform: link.platform,
        position: i,
      })),
    })

    setModalVisible(false)
    await fetchProgItems(userId)

    // Ouvre automatiquement le détail
    if (newItem) {
      setSelectedItem(newItem)
      setDetailModalVisible(true)
    }
  }

  const handleCardPress = (item: ProgItem) => {
    setSelectedItem(item)
    setDetailModalVisible(true)
  }

  const handleRefreshAfterDetail = async () => {
    if (userId) await fetchProgItems(userId)
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ryan-Prog</Text>
          <Text style={styles.headerSub}>
            Mémos & achats · {searchQuery ? `${visibleProgItems.length}/${progItems.length}` : progItems.length} éléments
          </Text>
        </View>
        <Text style={styles.headerIcon}>🛒</Text>
      </View>

      {/* SEARCH */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher article, vendeur, lieu, lien..."
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity
            style={styles.searchClearBtn}
            onPress={() => setSearch('')}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Text style={styles.searchClearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* COMPTEURS */}
      {progItems.length > 0 && (
        <View style={styles.counters}>
          <View style={[styles.counterBox, styles.counterWait]}>
            <Text style={styles.counterVal}>{searchQuery ? visibleEnAttente : enAttente}</Text>
            <Text style={styles.counterLbl}>En attente</Text>
          </View>
          <View style={[styles.counterBox, styles.counterDone]}>
            <Text style={styles.counterVal}>{searchQuery ? visibleAchete : achete}</Text>
            <Text style={styles.counterLbl}>Acheté ✅</Text>
          </View>
        </View>
      )}

      {/* LISTE */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.cyan}
          />
        }
      >
        {visibleProgItems.length === 0 && !isSearching ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>
              {progItems.length === 0 ? "Aucun mémo d'achat" : 'Aucun mémo trouvé'}
            </Text>
            <Text style={styles.emptySubText}>
              {progItems.length === 0
                ? 'Appuie sur + pour ajouter un article'
                : 'Essaie un autre mot-clé'}
            </Text>
          </View>
        ) : (
          visibleProgItems.map(item => (
            <ProgCard
              key={item.id}
              item={item}
              onToggleStatus={() =>
                updateProgItem(item.id, {
                  status: item.status === 'en_attente' ? 'achete' : 'en_attente',
                })
              }
              onDelete={() => deleteProgItem(item.id)}
              onPress={handleCardPress}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <ProgFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreateProgItem}
      />

      <ProgDetailModal
        visible={detailModalVisible}
        item={selectedItem}
        onClose={() => {
          setDetailModalVisible(false)
          if (userId) fetchProgItems(userId)
        }}
        onUpdate={updateProgItem}
        onDelete={deleteProgItem}
        onRefresh={handleRefreshAfterDetail}
      />

    </SafeAreaView>
  )
}


// COMPOSANT PROG CARD

function ProgCard({
  item,
  onToggleStatus,
  onDelete,
  onPress,
}: {
  item: ProgItem
  onToggleStatus: () => void
  onDelete: () => void
  onPress: (item: ProgItem) => void
}) {
  const isAchete = item.status === 'achete'
  const platformConfig = getPlatformConfig()

  const handleLink = (link: ProgLink) => {
    Linking.openURL(normalizeLinkUrl(link.url)).catch(() => { })
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >

      {/* TOP */}
      <View style={styles.cardTop}>
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0].url }} style={styles.iconBoxImage} />
        ) : (
          <View style={[styles.iconBox, isAchete
            ? { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.2)' }
            : { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.2)' }
          ]}>
            <Text style={styles.iconBoxEmoji}>{isAchete ? '🛒' : '🛍️'}</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <SyncBadge status={item._sync_status} />
          </View>
          <Text style={styles.cardPrice}>
            {item.price
              ? `${item.price.toLocaleString('fr-FR')} `
              : '— '}
            <Text style={styles.cardCurrency}>{item.currency}</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            isAchete ? styles.statusBadgeDone : styles.statusBadgeWait,
          ]}
          onPress={(e) => { e.stopPropagation(); onToggleStatus() }}
        >
          <Text style={[
            styles.statusText,
            isAchete ? styles.statusTextDone : styles.statusTextWait,
          ]}>
            {isAchete ? 'ACHETÉ' : 'EN ATTENTE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* MÉTA */}
      {(item.phone || item.address || item.note) && (
        <View style={styles.metaWrap}>
          {item.phone && (
            <TouchableOpacity
              style={styles.metaRow}
              onPress={(e) => { e.stopPropagation(); Linking.openURL(buildWhatsAppUrl(item.phone!)) }}
            >
              <Text style={styles.metaText}>📞 {item.phone}</Text>
            </TouchableOpacity>
          )}
          {item.address && (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>📍 {item.address}</Text>
            </View>
          )}
          {item.note && (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>📝 {item.note}</Text>
            </View>
          )}
        </View>
      )}

      {/* LIENS */}
      {item.links && item.links.length > 0 && (
        <View style={styles.linksWrap}>
          {item.links.map(link => {
            const cfg = platformConfig[link.platform] || platformConfig.web
            return (
              <TouchableOpacity
                key={link.id}
                style={[styles.linkChip, {
                  backgroundColor: cfg.bg,
                  borderWidth: 1,
                  borderColor: cfg.border,
                }]}
                onPress={(e) => { e.stopPropagation(); handleLink(link) }}
              >
                <View style={styles.linkChipInner}>
                  {cfg.icon}
                  <Text style={[styles.linkText, { color: cfg.color }]}>
                    {cfg.label}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* ACTIONS */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(e) => { e.stopPropagation(); onDelete() }}
        >
          <Text style={styles.deleteBtnText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>

    </TouchableOpacity>
  )
}


// STYLES

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  headerIcon: { fontSize: 26 },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 13, paddingVertical: 0 },
  searchClearBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  searchClearText: { fontSize: 11, color: Colors.muted, fontWeight: '700' },
  counters: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 12 },
  counterBox: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1 },
  counterWait: { backgroundColor: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.2)' },
  counterDone: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' },
  counterVal: { fontSize: 20, fontWeight: '800', color: Colors.text },
  counterLbl: { fontSize: 10, color: Colors.muted, marginTop: 2 },
  list: { flex: 1, paddingHorizontal: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, },
  
  iconBox: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconBoxEmoji: { fontSize: 20 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  cardPrice: { fontSize: 16, fontWeight: '800', color: Colors.cyan },
  cardCurrency: { fontSize: 11, fontWeight: '500', color: Colors.muted },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  statusBadgeWait: { backgroundColor: 'rgba(250,204,21,0.15)', borderColor: 'rgba(250,204,21,0.25)' },
  statusBadgeDone: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.25)' },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statusTextWait: { color: '#FDE68A' },
  statusTextDone: { color: '#86EFAC' },
  metaWrap: { gap: 4, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 11, color: Colors.muted },
  linksWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  linkChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  linkChipInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  linkText: { fontSize: 11, fontWeight: '700' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  deleteBtnText: { fontSize: 11, color: Colors.muted },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.text2, marginBottom: 8 },
  emptySubText: { fontSize: 13, color: Colors.muted, textAlign: 'center', paddingHorizontal: 40 },
  fab: { position: 'absolute', bottom: 80, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.cyan, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabIcon: { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 32 },
  iconBoxImage: { width: 44, height: 44, borderRadius: 12, flexShrink: 0 },
})

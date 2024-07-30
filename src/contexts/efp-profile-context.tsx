import {
  useState,
  useEffect,
  useContext,
  createContext,
  type Dispatch,
  type SetStateAction
} from 'react'
import {
  useQuery,
  useInfiniteQuery,
  type InfiniteData,
  type RefetchOptions,
  type QueryObserverResult,
  type FetchNextPageOptions,
  type InfiniteQueryObserverResult
} from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAccount, useChains } from 'wagmi'

import type {
  ProfileRoles,
  FollowSortType,
  FollowerResponse,
  FollowingResponse,
  ProfileListsResponse,
  ProfileDetailsResponse,
  FollowingTagsResponse
} from '#/types/requests'
import { useCart } from './cart-context'
import fetchProfileRoles from '#/api/fetchProfileRoles'
import fetchProfileLists from '#/api/fetchProfileLists'
import type { ProfileTableTitleType } from '#/types/common'
import fetchProfileDetails from '#/api/fetchProfileDetails'
import fetchProfileFollowers from '#/api/fetchProfileFollowers'
import fetchProfileFollowing from '#/api/fetchProfileFollowing'
import fetchFollowerTags, { nullFollowerTags } from '#/api/fetchFollowerTags'
import fetchFollowingTags, { nullFollowingTags } from '#/api/fetchFollowingTags'
import { BLOCKED_MUTED_TAGS, DEFAULT_TAGS_TO_ADD, FETCH_LIMIT_PARAM } from '#/lib/constants'

// Define the type for the profile context
type EFPProfileContextType = {
  selectedList?: number
  setSelectedList: Dispatch<SetStateAction<number | undefined>>
  lists?: ProfileListsResponse | null
  profile?: ProfileDetailsResponse | null
  followingTags?: FollowingTagsResponse
  followerTags?: FollowingTagsResponse
  followers: FollowerResponse[]
  following: FollowingResponse[]
  roles?: ProfileRoles
  listsIsLoading: boolean
  profileIsLoading: boolean
  followingTagsLoading: boolean
  followerTagsLoading: boolean
  followersIsLoading: boolean
  followingIsLoading: boolean
  isFetchingMoreFollowers: boolean
  isFetchingMoreFollowing: boolean
  isEndOfFollowers: boolean
  isEndOfFollowing: boolean
  fetchMoreFollowers: (options?: FetchNextPageOptions) => Promise<
    InfiniteQueryObserverResult<
      InfiniteData<
        {
          followers: FollowerResponse[]
          nextPageParam: number
        },
        unknown
      >,
      Error
    >
  >
  fetchMoreFollowing: (options?: FetchNextPageOptions) => Promise<
    InfiniteQueryObserverResult<
      InfiniteData<
        {
          following: FollowingResponse[]
          nextPageParam: number
        },
        unknown
      >,
      Error
    >
  >
  refetchLists: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<ProfileListsResponse | null, Error>>
  refetchProfile: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<ProfileDetailsResponse | null, Error>>
  refetchFollowingTags: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<FollowingTagsResponse | undefined, Error>>
  refetchFollowerTags: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<FollowingTagsResponse | undefined, Error>>
  refetchFollowers: (
    options?: RefetchOptions | undefined
  ) => Promise<
    QueryObserverResult<
      InfiniteData<{ followers: FollowerResponse[]; nextPageParam: number }, unknown>,
      Error
    >
  >
  refetchFollowing: (
    options?: RefetchOptions | undefined
  ) => Promise<
    QueryObserverResult<
      InfiniteData<{ following: FollowingResponse[]; nextPageParam: number }, unknown>,
      Error
    >
  >
  refetchRoles: (options?: RefetchOptions) => Promise<QueryObserverResult<ProfileRoles, Error>>
  recentTags: string[]
  followingTagsFilter: string[]
  followersTagsFilter: string[]
  followingSort: FollowSortType
  followersSort: FollowSortType
  addRecentTag: (tag: string) => void
  toggleTag: (tab: ProfileTableTitleType, tag: string) => void
  setFollowingSort: (option: FollowSortType) => void
  setFollowersSort: (option: FollowSortType) => void
  setFollowingTagsFilter: Dispatch<SetStateAction<string[]>>
  setFollowersTagsFilter: Dispatch<SetStateAction<string[]>>
  setIsRefetchingProfile: (state: boolean) => void
  setIsRefetchingFollowing: (state: boolean) => void
  setSetNewListAsSelected: (state: boolean) => void
}

type Props = {
  children: React.ReactNode
}

const EFPProfileContext = createContext<EFPProfileContextType | undefined>(undefined)

export const EFPProfileProvider: React.FC<Props> = ({ children }) => {
  const [isRefetchingProfile, setIsRefetchingProfile] = useState(false)
  const [isRefetchingFollowing, setIsRefetchingFollowing] = useState(false)

  // selectedList = undefined will mean that the connected user can create a new list
  const [selectedList, setSelectedList] = useState<number>()
  const [setNewListAsSelected, setSetNewListAsSelected] = useState(false)

  const [followingTagsFilter, setFollowingTagsFilter] = useState<string[]>([])
  const [followersTagsFilter, setFollowersTagsFilter] = useState<string[]>([])
  const [followingSort, setFollowingSort] = useState<FollowSortType>('latest first')
  const [followersSort, setFollowersSort] = useState<FollowSortType>('latest first')

  const [recentTags, setRecentTags] = useState(DEFAULT_TAGS_TO_ADD)

  const chains = useChains()
  const router = useRouter()
  const { resetCart } = useCart()
  const { address: userAddress } = useAccount()

  // Need new endpoint /userAddress/lists which returns a primary list and the array of lists
  // this is gonna be userLists and we need an useEffect and then set the appropriate list as selectedList (either primary list or list with the lowest number (tokenId))

  const {
    data: lists,
    isLoading: listsIsLoading,
    refetch: refetchLists
  } = useQuery({
    queryKey: ['lists', userAddress],
    queryFn: async () => {
      if (!userAddress) return null

      const fetchedLists = await fetchProfileLists(userAddress)
      return fetchedLists
    }
  })

  useEffect(() => {
    if (!lists?.lists) return setSelectedList(undefined)

    if (setNewListAsSelected) {
      setSetNewListAsSelected(false)

      const newList = Math.max(...lists.lists.map(list => Number(list)))

      router.push(`/${newList}`)
      localStorage.setItem('selected-list', newList.toString())
      setSelectedList(newList)

      return
    }

    const persistedList = localStorage.getItem('selected-list')
    if (persistedList && lists.lists.includes(persistedList))
      return setSelectedList(Number(persistedList))
    if (persistedList === 'new list') return setSelectedList(undefined)

    if (lists?.primary_list) {
      localStorage.setItem('selected-list', lists.primary_list)
      return setSelectedList(Number(lists.primary_list))
    }
    if (lists?.lists?.length > 0) {
      localStorage.setItem(
        'selected-list',
        Math.min(...lists.lists.map(list => Number(list))).toString()
      )
      return setSelectedList(Math.min(...lists.lists.map(list => Number(list))))
    }

    setSelectedList(undefined)
  }, [lists])

  const {
    data: profile,
    isLoading: profileIsLoading,
    refetch: refetchProfile,
    isRefetching: isRefetchingProfileQuery
  } = useQuery({
    queryKey: ['profile', userAddress, selectedList],
    queryFn: async () => {
      if (!userAddress) {
        setIsRefetchingProfile(false)
        return null
      }

      const fetchedProfile = await fetchProfileDetails(userAddress, selectedList)

      setIsRefetchingProfile(false)

      return fetchedProfile
    }
    // refetchInterval: 60000
  })

  const {
    data: followerTags,
    refetch: refetchFollowerTags,
    isLoading: followerTagsLoading,
    isRefetching: isRefetchingFollowerTagsQuery
  } = useQuery({
    queryKey: ['follower tags', userAddress, selectedList],
    queryFn: async () => {
      if (!userAddress) return nullFollowerTags

      const fetchedTags = await fetchFollowerTags(userAddress, selectedList)
      return fetchedTags
    }
  })

  const [isEndOfFollowers, setIsEndOfFollowers] = useState(false)
  // Fetch followings depending on the selected list
  const {
    data: fetchedFollowers,
    refetch: refetchFollowers,
    isLoading: followersIsLoading,
    fetchNextPage: fetchMoreFollowers,
    isRefetching: isRefetchingFollowersQuery,
    isFetchingNextPage: isFetchingMoreFollowers
  } = useInfiniteQuery({
    queryKey: ['followers', userAddress, selectedList, followersSort, followersTagsFilter],
    queryFn: async ({ pageParam = 0 }) => {
      setIsEndOfFollowers(true)

      if (!userAddress) {
        return {
          followers: [],
          nextPageParam: pageParam
        }
      }

      const fetchedFollowers = await fetchProfileFollowers({
        addressOrName: userAddress,
        list: selectedList,
        limit: FETCH_LIMIT_PARAM,
        sort: followersSort,
        tags: followersTagsFilter,
        pageParam
      })

      if (fetchedFollowers.followers.length === 0) setIsEndOfFollowers(true)

      return fetchedFollowers
    },
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextPageParam
    // refetchInterval: 60000
  })

  const {
    data: followingTags,
    isLoading: followingTagsLoading,
    refetch: refetchFollowingTags,
    isRefetching: isRefetchingFollowingTagsQuery
  } = useQuery({
    queryKey: ['following tags', userAddress, selectedList],
    queryFn: async () => {
      if (!userAddress) return nullFollowingTags

      const fetchedProfile = await fetchFollowingTags(userAddress, selectedList)
      return fetchedProfile
    }
    // refetchInterval: 60000
  })

  const [isEndOfFollowing, setIsEndOfFollowing] = useState(false)
  // fetch followers depending on list for the user of the list you are viewing or show connected address followers if no list is selected
  const {
    data: fetchedFollowing,
    isLoading: followingIsLoading,
    fetchNextPage: fetchMoreFollowing,
    isFetchingNextPage: isFetchingMoreFollowing,
    refetch: refetchFollowing,
    isRefetching: isRefetchingFollowingQuery
  } = useInfiniteQuery({
    queryKey: ['following', userAddress, selectedList, followingSort, followingTagsFilter],
    queryFn: async ({ pageParam = 0 }) => {
      setIsEndOfFollowing(false)

      if (!(userAddress && selectedList)) {
        setIsRefetchingFollowing(false)
        return {
          following: [],
          nextPageParam: pageParam
        }
      }

      const fetchedFollowing = await fetchProfileFollowing({
        addressOrName: userAddress,
        list: selectedList,
        limit: FETCH_LIMIT_PARAM,
        sort: followingSort,
        tags: followingTagsFilter,
        pageParam
      })

      if (fetchedFollowing?.following?.length === 0) setIsEndOfFollowing(true)
      setIsRefetchingFollowing(false)

      return fetchedFollowing
    },
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextPageParam
  })

  const followers = fetchedFollowers
    ? fetchedFollowers.pages.reduce(
        (acc, el) => [...acc, ...el.followers],
        [] as FollowerResponse[]
      )
    : []

  const following = fetchedFollowing
    ? fetchedFollowing.pages.reduce(
        (acc, el) => [...acc, ...el.following],
        [] as FollowingResponse[]
      )
    : []

  useEffect(() => {
    const cartList = localStorage.getItem('cart list')
    const cartAddress = localStorage.getItem('cart address')

    if (
      ((userAddress?.toLowerCase() === cartAddress?.toLowerCase() || !userAddress) &&
        Number(cartList) === Number(selectedList)) ||
      lists === undefined
    )
      return

    resetCart()

    if (selectedList) localStorage.setItem('cart list', selectedList.toString())
  }, [userAddress, selectedList])

  const toggleTag = (tab: ProfileTableTitleType, tag: string) => {
    if (tab === 'following') {
      if (followingTagsFilter.includes(tag)) {
        setFollowingTagsFilter(followingTagsFilter.filter(item => item !== tag))
      } else {
        setFollowingTagsFilter([...followingTagsFilter, tag])
      }
    }

    if (tab === 'followers') {
      if (followersTagsFilter.includes(tag)) {
        setFollowersTagsFilter(followersTagsFilter.filter(item => item !== tag))
      } else {
        setFollowersTagsFilter([...followersTagsFilter, tag])
      }
    }
  }

  const addRecentTag = (tag: string) => {
    setRecentTags([tag, ...recentTags.filter(recentTag => recentTag !== tag)].slice(0, 5))
  }

  useEffect(() => {
    if (followingTags?.tagCounts && followingTags?.tagCounts.length > 0)
      setRecentTags(
        followingTags?.tagCounts
          ?.sort((a, b) => b.count - a.count)
          .map(tag => tag.tag)
          .filter(tag => !BLOCKED_MUTED_TAGS.includes(tag))
          .slice(0, 5)
      )
  }, [followingTags])

  const { data: roles, refetch: refetchRoles } = useQuery({
    queryKey: ['userRoles', userAddress, selectedList],
    queryFn: async () => {
      if (!(selectedList && userAddress))
        return {
          isOwner: true,
          isManager: true,
          isUser: true
        }

      const fetchedRoles = await fetchProfileRoles({
        list: selectedList,
        chains,
        userAddress
      })

      return fetchedRoles
    }
  })

  return (
    <EFPProfileContext.Provider
      value={{
        selectedList,
        setSelectedList,
        lists,
        profile,
        followerTags,
        followingTags,
        followers,
        following,
        roles,
        listsIsLoading,
        followerTagsLoading: followerTagsLoading || isRefetchingFollowerTagsQuery,
        followingTagsLoading: followingTagsLoading || isRefetchingFollowingTagsQuery,
        profileIsLoading:
          listsIsLoading || isRefetchingProfile || profileIsLoading || isRefetchingProfileQuery,
        followingIsLoading:
          listsIsLoading ||
          isRefetchingFollowing ||
          followingIsLoading ||
          isRefetchingFollowingQuery,
        followersIsLoading: listsIsLoading || followersIsLoading || isRefetchingFollowersQuery,
        isFetchingMoreFollowers: !isEndOfFollowers && isFetchingMoreFollowers,
        isFetchingMoreFollowing: !isEndOfFollowing && isFetchingMoreFollowing,
        isEndOfFollowers,
        isEndOfFollowing,
        fetchMoreFollowers,
        fetchMoreFollowing,
        refetchLists,
        refetchProfile,
        refetchFollowers,
        refetchFollowing,
        refetchFollowerTags,
        refetchFollowingTags,
        refetchRoles,
        recentTags,
        followingTagsFilter,
        followersTagsFilter,
        followingSort,
        followersSort,
        addRecentTag,
        toggleTag,
        setFollowingSort: (option: FollowSortType) => {
          setFollowingSort(option)
        },
        setFollowersSort: (option: FollowSortType) => {
          setFollowersSort(option)
        },
        setFollowingTagsFilter,
        setFollowersTagsFilter,
        setIsRefetchingProfile,
        setIsRefetchingFollowing,
        setSetNewListAsSelected
      }}
    >
      {children}
    </EFPProfileContext.Provider>
  )
}

export const useEFPProfile = (): EFPProfileContextType => {
  const context = useContext(EFPProfileContext)
  if (context === undefined) {
    throw new Error('useEFPProfile must be used within an EFPProfileProvider')
  }
  return context
}

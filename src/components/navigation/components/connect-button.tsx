'use client'

import i18n from '#/i18n'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { useClickAway } from '@uidotdev/usehooks'
import type { Address, GetEnsAvatarReturnType } from 'viem'
import { useAccountModal, useConnectModal } from '@rainbow-me/rainbowkit'

import { truncateAddress } from '#/lib/utilities'
import ArrowLeft from 'public/assets/icons/arrow-left.svg'
import { resolveENSProfile } from '#/utils/resolveAddress'
import ArrowDown from 'public/assets/icons/arrow-down.svg'
import DefaultAvatar from 'public/assets/art/default-avatar.svg'
import { LANGUAGES } from '#/lib/constants'
import { useTranslation } from 'react-i18next'

const nullEnsProfile = {
  name: null,
  avatar: null
}

const ConnectButton = () => {
  const [ensProfile, setENSProfile] = useState<{
    name: string | null
    avatar: GetEnsAvatarReturnType | null
  }>(nullEnsProfile)

  const [walletMenOpenu, setWalletMenuOpen] = useState(false)
  const [languageMenOpenu, setLanguageMenuOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(
    LANGUAGES[LANGUAGES.map(lang => lang.key).indexOf(i18n.language || 'en')]?.language
  )

  const clickAwayWalletRef = useClickAway<HTMLDivElement>(_ => {
    setWalletMenuOpen(false)
  })
  const clickAwayLanguageRef = useClickAway<HTMLDivElement>(_ => {
    setLanguageMenuOpen(false)
  })

  const { t } = useTranslation()
  console.log(i18n.language, languageMenOpenu)
  const { disconnect } = useDisconnect()
  const { address: userAddress } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { openAccountModal } = useAccountModal()

  const getENSProfile = async (address: Address) => {
    const data = await resolveENSProfile(address)
    setENSProfile(data)
  }

  useEffect(() => {
    if (!userAddress) {
      setENSProfile(nullEnsProfile)
      return
    }

    getENSProfile(userAddress)
  }, [userAddress])

  return (
    <div ref={clickAwayWalletRef} className='relative'>
      <button
        type='button'
        // className='bg-gradient-to-br p-[2px] from-yellow to-pink cursor-pointer h-12 rounded-full w-40'
        className='border-[#FFC057] z-50 hover:bg-[#FFC057]/10 px-1 transition-colors border-2 gap-[6px] cursor-pointer flex justify-between items-center h-12 glass-card rounded-full w-fit sm:w-48'
        onClick={() =>
          userAddress && openAccountModal
            ? setWalletMenuOpen(!walletMenOpenu)
            : openConnectModal
              ? openConnectModal()
              : null
        }
      >
        {userAddress ? (
          <>
            <Image
              src={ensProfile.avatar || DefaultAvatar}
              alt='ENS Avatar'
              width={36}
              height={36}
              className='rounded-full'
              unoptimized={true}
            />
            <p className='font-semibold hidden sm:block truncate text-sm'>
              {ensProfile.name || truncateAddress(userAddress)}
            </p>
            <Image
              src={ArrowDown}
              alt='Open button'
              className={`${walletMenOpenu ? 'rotate-180' : ''} transition-transform w-4 mr-1`}
            />
          </>
        ) : (
          <div className='w-full h-full flex items-center justify-center  rounded-full'>
            <p className='font-semibold text-nowrap px-1 text-black'>{t('navigation.connect')}</p>
          </div>
        )}
      </button>
      {walletMenOpenu && (
        <div className='p-3 flex gap-1.5 w-fit z-50 shadow-md border-2 rounded-lg bg-white/95 border-gray-200 absolute top-[120%] flex-col items-end right-0'>
          <div className='flex justify-between items-center w-full hover:opacity-80 transition-opacity cursor-pointer'>
            <Image src={ArrowLeft} alt='Show lists' />
            <p className=' font-semibold'>List #0</p>
          </div>
          <div ref={clickAwayLanguageRef} className='w-full cursor-pointer group relative'>
            <div
              onClick={() => setLanguageMenuOpen(true)}
              className='flex justify-between items-center w-full'
            >
              <Image
                src={ArrowLeft}
                alt='Show languages'
                className='group-hover:opacity-80 transition-opacity'
              />
              <p className='group-hover:opacity-80 transition-opacity font-semibold'>
                {selectedLanguage}
              </p>
            </div>
            <div className='absolute right-[100%] -top-2 group-hover:block pr-5'>
              <div className='flex flex-col gap-2 glass-card bg-white/90 border-2 border-gray-200 px-4 py-2 rounded-lg shadow-md'>
                {LANGUAGES.map(lang => (
                  <p
                    className=' text-darkGrey font-semibold hover:text-gray-500 transition-colors'
                    key={lang.language}
                    onClick={() => {
                      i18n.changeLanguage(lang.key)
                      setSelectedLanguage(lang.language)
                      setLanguageMenuOpen(false)
                    }}
                  >
                    {lang.language}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <p
            className='text-red-500 font-semibold w-full text-nowrap hover:text-opacity-75 transition-opacity cursor-pointer'
            onClick={() => {
              disconnect()
              setWalletMenuOpen(false)
            }}
          >
            {t('navigation.disconnect')}
          </p>
        </div>
      )}
    </div>
  )
}

export default ConnectButton

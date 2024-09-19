import React from 'react'
import { useState, useEffect, createContext, useContext } from 'react'
import { useNetwork } from './NetworkContext'
import '@polkadot/api-augment'
import { createClient, PolkadotClient, TypedApi } from 'polkadot-api'
import { getWsProvider } from 'polkadot-api/ws-provider/web'
import { dotPpl, ksmPpl, pasPpl, wesPpl } from '@polkadot-api/descriptors'

export type PplApiType = TypedApi<typeof dotPpl | typeof ksmPpl | typeof pasPpl | typeof wesPpl>

type ApiContextProps = {
  children: React.ReactNode | React.ReactNode[]
}

export interface IApiContext {
  pplApi?: false | PplApiType
  pplChainInfo?: ChainInfoHuman
  client?: PolkadotClient
}

export interface ChainInfoHuman {
  ss58Format: number
  tokenDecimals: number
  tokenSymbol: string
}

// interface RawChainInfoHuman {
//   ss58Format: string
//   tokenDecimals: string[]
//   tokenSymbol: string[]
// }

const PplApiContext = createContext<IApiContext | undefined>(undefined)

const PplApiContextProvider = ({ children }: ApiContextProps) => {
  const { selectedNetworkInfo } = useNetwork()
  const [pplChainInfo, setPplChainInfo] = useState<ChainInfoHuman | undefined>()
  const [pplApi, setPplApi] = useState<IApiContext['pplApi']>()
  const [client, setClient] = useState<IApiContext['client']>()

  useEffect(() => {
    if (!selectedNetworkInfo?.pplChainRpcUrl) return

    let cl: PolkadotClient | undefined
    let typedApi: PplApiType | undefined

    switch (selectedNetworkInfo?.chainId) {
      case 'kusama':
        cl = createClient(getWsProvider(selectedNetworkInfo.pplChainRpcUrl))
        typedApi = cl.getTypedApi(ksmPpl)
        break
      case 'polkadot':
        cl = createClient(getWsProvider(selectedNetworkInfo.pplChainRpcUrl))
        typedApi = cl.getTypedApi(dotPpl)
        break
      case 'paseo':
        cl = createClient(getWsProvider(selectedNetworkInfo.pplChainRpcUrl))
        typedApi = cl.getTypedApi(pasPpl)
        break
      case 'westend':
        cl = createClient(getWsProvider(selectedNetworkInfo.pplChainRpcUrl))
        typedApi = cl.getTypedApi(wesPpl)
        break
    }

    if (!cl || !typedApi) return

    setClient(cl)
    setPplApi(typedApi)
  }, [selectedNetworkInfo])

  useEffect(() => {
    if (!client) return

    client?.getChainSpecData().then(({ properties }) => {
      if (!properties) return

      const tokenDecimals = Array.isArray(properties?.tokenDecimals)
        ? properties?.tokenDecimals[0]
        : properties?.tokenDecimals

      const tokensymbol = Array.isArray(properties?.tokenSymbol)
        ? properties?.tokenSymbol[0]
        : properties?.tokenSymbol

      setPplChainInfo({
        // some parachains such as interlay have a comma in the format, e.g: "2,042"
        ss58Format: Number(properties?.ss58Format.replace(',', '')) || 0,
        tokenDecimals: Number(tokenDecimals) || 0,
        tokenSymbol: tokensymbol || ''
      })
    })
  }, [client])

  return (
    <PplApiContext.Provider
      value={{
        client,
        pplApi,
        pplChainInfo: pplChainInfo
      }}
    >
      {children}
    </PplApiContext.Provider>
  )
}

const usePplApi = () => {
  const context = useContext(PplApiContext)
  if (context === undefined) {
    throw new Error('usePplApi must be used within a PplApiContextProvider')
  }
  return context
}

export { PplApiContextProvider, usePplApi }

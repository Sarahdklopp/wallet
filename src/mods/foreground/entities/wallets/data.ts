import { EthereumChain } from "@/libs/ethereum/chain"
import { RpcRequestPreinit } from "@/libs/rpc"
import { Optional } from "@hazae41/option"
import { Result } from "@hazae41/result"
import { Fetched, FetcherMore, createQuerySchema, useError, useFetch, useOnce, useQuery } from "@hazae41/xswr"
import { Background } from "../../background/background"
import { useBackground } from "../../background/context"

export type Wallet =
  | WalletRef
  | WalletData

export interface WalletProps {
  wallet: Wallet
}

export interface WalletDataProps {
  wallet: WalletData
}

export interface WalletRef {
  ref: true
  uuid: string
}

export type WalletData =
  | EthereumPrivateKeyWallet

export interface EthereumPrivateKeyWallet {
  coin: "ethereum"
  type: "privateKey"

  uuid: string
  name: string,

  color: number,
  emoji: string

  privateKey: string
  address: string
}

export interface BitcoinPrivateKeyWallet {
  coin: "bitcoin"
  type: "privateKey"

  uuid: string
  name: string,

  color: number,
  emoji: string

  privateKey: string
  compressedAddress: string
  uncompressedAddress: string
}

export function getWallet(uuid: Optional<string>, background: Background) {
  if (uuid === undefined)
    return undefined

  const fetcher = async <T>(init: RpcRequestPreinit<unknown>, more: FetcherMore = {}) =>
    Fetched.rewrap(await background.tryRequest<T>(init).then(r => r.andThenSync(x => x)))

  return createQuerySchema<RpcRequestPreinit<unknown>, WalletData, Error>({
    method: "brume_getWallet",
    params: [uuid]
  }, fetcher)
}

export function useWallet(uuid: Optional<string>, background: Background) {
  const query = useQuery(getWallet, [uuid, background])
  useOnce(query)
  return query
}

export type EthereumQueryKey<T> = RpcRequestPreinit<T> & {
  chainId: number
}

export interface EthereumHandle {
  session: string,
  chain: EthereumChain,
  background: Background
}

export interface EthereumHandleProps {
  handle: EthereumHandle
}

export function useEthereumHandle(session: string, chain: EthereumChain): EthereumHandle {
  const background = useBackground()
  return { session, chain, background }
}

export async function tryFetch<T>(key: EthereumQueryKey<unknown>, ethereum: EthereumHandle): Promise<Fetched<T, Error>> {
  return await Result.unthrow<Result<T, Error>>(async t => {
    const { background, session, chain } = ethereum

    const { method, params } = key
    const subrequest = { method, params }

    return await background.tryRequest<T>({
      method: "brume_fetchEthereum",
      params: [session, chain.id, subrequest]
    }).then(r => r.throw(t))
  }).then(r => Fetched.rewrap(r))
}

export function getBalanceSchema(address: string, ethereum: EthereumHandle) {
  const fetcher = async (init: EthereumQueryKey<unknown>, more: FetcherMore = {}) =>
    await tryFetch<string>(init, ethereum).then(r => r.mapSync(BigInt))

  return createQuerySchema({
    chainId: ethereum.chain.id,
    method: "eth_getBalance",
    params: [address, "pending"]
  }, fetcher)
}

export function useBalance(address: string, ethereum: EthereumHandle) {
  const query = useQuery(getBalanceSchema, [address, ethereum])
  useFetch(query)
  useError(query, console.error)
  return query
}

export function getNonceSchema(address: string, ethereum: EthereumHandle) {
  const fetcher = async (init: EthereumQueryKey<unknown>, more: FetcherMore = {}) =>
    await tryFetch<string>(init, ethereum).then(r => r.mapSync(BigInt))

  return createQuerySchema({
    chainId: ethereum.chain.id,
    method: "eth_getTransactionCount",
    params: [address, "pending"]
  }, fetcher)
}

export function useNonce(address: string, ethereum: EthereumHandle) {
  const query = useQuery(getNonceSchema, [address, ethereum])
  useFetch(query)
  useError(query, console.error)
  return query
}

export function getGasPriceSchema(ethereum: EthereumHandle) {
  const fetcher = async (init: EthereumQueryKey<unknown>, more: FetcherMore = {}) =>
    await tryFetch<string>(init, ethereum).then(r => r.mapSync(BigInt))

  return createQuerySchema({
    chainId: ethereum.chain.id,
    method: "eth_gasPrice",
    params: []
  }, fetcher)
}

export function useGasPrice(ethereum: EthereumHandle) {
  const query = useQuery(getGasPriceSchema, [ethereum])
  useFetch(query)
  useError(query, console.error)
  return query
}
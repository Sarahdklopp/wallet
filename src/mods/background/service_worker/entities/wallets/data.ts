import { BigInts } from "@/libs/bigints/bigints"
import { RpcRequestPreinit } from "@/libs/rpc"
import { Option } from "@hazae41/option"
import { Cancel, Looped, Retry, tryLoop } from "@hazae41/piscine"
import { Err, Ok, Result } from "@hazae41/result"
import { FetchError, Fetched, FetcherMore, IDBStorage, NormalizerMore, createQuerySchema } from "@hazae41/xswr"
import { EthereumBrumes, EthereumSocket } from "../sessions/data"

export type Wallet =
  | WalletRef
  | WalletData

export interface WalletProps {
  readonly wallet: Wallet
}

export interface WalletDataProps {
  readonly wallet: WalletData
}

export interface WalletRef {
  readonly ref: true
  readonly uuid: string
}

export type WalletData =
  | EthereumPrivateKeyWallet

export interface EthereumPrivateKeyWallet {
  readonly coin: "ethereum"
  readonly type: "privateKey"

  readonly uuid: string
  readonly name: string,

  readonly color: number,
  readonly emoji: string

  readonly privateKey: string
  readonly address: string
}

export interface BitcoinPrivateKeyWallet {
  readonly coin: "bitcoin"
  readonly type: "privateKey"

  readonly uuid: string
  readonly name: string,

  readonly color: number,
  readonly emoji: string

  readonly privateKey: string
  readonly compressedAddress: string
  readonly uncompressedAddress: string
}

export function getWallet(uuid: string, storage: IDBStorage) {
  return createQuerySchema<string, WalletData, never>(`wallet/${uuid}`, undefined, { storage })
}

export async function getWalletRef(wallet: Wallet, storage: IDBStorage, more: NormalizerMore) {
  if ("ref" in wallet) return wallet

  const schema = getWallet(wallet.uuid, storage)
  await schema?.normalize(wallet, more)

  return { ref: true, uuid: wallet.uuid } as WalletRef
}

export type EthereumQueryKey<T> = RpcRequestPreinit<T> & {
  chainId: number
}

export interface EthereumSession {
  wallet: Wallet
  chainId: number
}

export function getEthereumSession(uuid: string) {
  return createQuerySchema<string, EthereumSession, never>(`sessions/${uuid}`, undefined)
}

export interface EthereumSessionAndBrumes {
  session: EthereumSession
  brumes: EthereumBrumes
}

export interface EthereumQueryMore {
  session: { chainId: number }
  brumes?: EthereumBrumes
}

export async function tryFetch<T>(ethereum: EthereumQueryMore, request: RpcRequestPreinit<unknown>, more: FetcherMore = {}) {
  if (ethereum.brumes === undefined)
    return new Err(new FetchError())

  const brumes = ethereum.brumes

  return await tryLoop(async (i) => {
    return await Result.unthrow<Result<Fetched<T, Error>, Looped<Error>>>(async t => {
      const brume = await brumes.inner.tryGet(i).then(r => r.mapErrSync(Retry.new).throw(t))
      const socket = Option.wrap(brume.chains[ethereum.session.chainId]).ok().mapErrSync(Cancel.new).throw(t)
      const response = await EthereumSocket.request<T>(socket, request).then(r => r.mapErrSync(Retry.new).throw(t))

      return new Ok(Fetched.rewrap(response))
    })
  }).then(r => r.mapErrSync(FetchError.from))
}

export function getEthereumUnknown(ethereum: EthereumQueryMore, request: RpcRequestPreinit<unknown>, storage: IDBStorage) {
  const fetcher = async ({ method, params }: EthereumQueryKey<unknown>) =>
    await tryFetch<unknown>(ethereum, { method, params }, {})

  return createQuerySchema<EthereumQueryKey<unknown>, any, Error>({
    chainId: ethereum.session.chainId,
    method: request.method,
    params: request.params
  }, fetcher, { storage })
}

export function getEthereumBalance(ethereum: EthereumQueryMore, address: string, block: string, storage: IDBStorage) {
  const fetcher = async ({ method, params }: EthereumQueryKey<unknown>) =>
    await tryFetch<string>(ethereum, { method, params }, {}).then(r => r.mapSync(d => d.mapSync(BigInt)))

  return createQuerySchema<EthereumQueryKey<unknown>, bigint, Error>({
    chainId: ethereum.session.chainId,
    method: "eth_getBalance",
    params: [address, block]
  }, fetcher, { storage, dataSerializer: BigInts })
}
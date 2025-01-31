import { Abi, ZeroHexString } from "@hazae41/cubane";
import { Data, Fail, FetcherMore, IDBStorage, createQuery } from "@hazae41/glacier";
import { Catched, Result } from "@hazae41/result";
import { BgEthereumContext } from "../../context";
import { EthereumQueryKey } from "../wallets/data";

export namespace BgSignature {

  export type Key = EthereumQueryKey<unknown>
  export type Data = readonly string[]
  export type Fail = Error

  export const method = "sig_getSignatures"

  export function key(hash: ZeroHexString) {
    return Result.runAndWrapSync(() => ({
      chainId: 100,
      method: "eth_call",
      params: [{
        to: "0xe6D819633998d87927C7310f7F7154c6e3A1a00F",
        data: Abi.encodeOrThrow(Abi.FunctionSignature.parseOrThrow("get(bytes4)").from(hash))
      }, "latest"]
    })).ok().inner
  }

  export function schema(hash: ZeroHexString, ethereum: BgEthereumContext, storage: IDBStorage) {
    const maybeKey = key(hash)

    if (maybeKey == null)
      return

    const fetcher = async (request: Key, more: FetcherMore) => {
      try {
        const fetched = await BgEthereumContext.fetchOrFail<ZeroHexString>(ethereum, request)

        if (fetched.isErr())
          return fetched

        const returns = Abi.createTuple(Abi.createVector(Abi.String))
        const [texts] = Abi.decodeOrThrow(returns, fetched.inner).intoOrThrow()

        return new Data(texts)
      } catch (e: unknown) {
        return new Fail(Catched.from(e))
      }
    }

    return createQuery<Key, Data, Fail>({
      key: maybeKey,
      fetcher,
      storage
    })
  }

}
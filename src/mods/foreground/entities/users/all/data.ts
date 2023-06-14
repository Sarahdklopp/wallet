import { RpcRequestPreinit } from "@/libs/rpc";
import { Background } from "@/mods/foreground/background/background";
import { Fetched, FetcherMore, createQuerySchema, useOnce, useQuery } from "@hazae41/xswr";
import { User } from "../data";

export function getUsers(background: Background) {
  const fetcher = async <T>(init: RpcRequestPreinit<unknown>, more: FetcherMore = {}) =>
    Fetched.rewrap(await background.tryRequest<T>(init).then(r => r.andThenSync(x => x)))

  return createQuerySchema<RpcRequestPreinit<unknown>, User[], Error>({
    method: "brume_getUsers"
  }, fetcher)
}

export function useUsers(background: Background) {
  const query = useQuery(getUsers, [background])
  useOnce(query)
  return query
}
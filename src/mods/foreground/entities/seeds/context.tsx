import { ChildrenProps } from "@/libs/react/props/children"
import { UUIDProps } from "@/libs/react/props/uuid"
import { SeedData } from "@/mods/background/service_worker/entities/seeds/data"
import { Nullable, Option } from "@hazae41/option"
import { createContext, useContext } from "react"
import { useSeed } from "./data"

export const SeedDataContext =
  createContext<Nullable<SeedData>>(undefined)

export function useSeedDataContext() {
  return Option.unwrap(useContext(SeedDataContext))
}

export function SeedDataProvider(props: UUIDProps & ChildrenProps) {
  const { uuid, children } = props

  const seed = useSeed(uuid)

  if (seed.current == null)
    return null

  return <SeedDataContext.Provider value={seed.current.get()}>
    {children}
  </SeedDataContext.Provider>
}

import { chainByChainId } from "@/libs/ethereum/mods/chain";
import { Outline } from "@/libs/icons/icons";
import { useEffectButNotFirstTime } from "@/libs/react/effect";
import { useInputChange, useKeyboardEnter } from "@/libs/react/events";
import { Dialog, useDialogContext } from "@/libs/ui/dialog/dialog";
import { usePathState, useSearchState } from "@/mods/foreground/router/path/context";
import { Address } from "@hazae41/cubane";
import { Optional } from "@hazae41/option";
import { SyntheticEvent, useCallback, useDeferredValue, useState } from "react";
import { ShrinkableContrastButtonInInputBox, ShrinkableNakedButtonInInputBox, SimpleBox, SimpleInput, UrlState } from ".";
import { useEnsLookup } from "../../../../names/data";
import { useWalletDataContext } from "../../../context";
import { useEthereumContext } from "../../../data";

export function WalletSendScreenTarget(props: {}) {
  const wallet = useWalletDataContext().unwrap()
  const { close } = useDialogContext().unwrap()

  const $state = usePathState<UrlState>()
  const [step, setStep] = useSearchState("step", $state)
  const [target, setTarget] = useSearchState("target", $state)

  const mainnet = useEthereumContext(wallet.uuid, chainByChainId[1])

  const [rawTargetInput = "", setRawTargetInput] = useState<Optional<string>>(target)

  const onTargetInputChange = useInputChange(e => {
    setRawTargetInput(e.target.value)
  }, [])

  const targetInput = useDeferredValue(rawTargetInput)

  useEffectButNotFirstTime(() => {
    setTarget(targetInput)
  }, [targetInput])

  const maybeEnsInput = target?.endsWith(".eth")
    ? targetInput
    : undefined

  const ensQuery = useEnsLookup(maybeEnsInput, mainnet)
  const maybeEns = ensQuery.current?.ok().get()

  const onSubmit = useCallback(async () => {
    if (target == null)
      return
    if (Address.from(target) == null && !target.endsWith(".eth"))
      return
    setStep("value")
  }, [target, setStep])

  const onEnter = useKeyboardEnter(() => {
    onSubmit()
  }, [onSubmit])

  const onClear = useCallback((e: SyntheticEvent) => {
    setRawTargetInput("")
  }, [])

  const onPaste = useCallback(async () => {
    const input = await navigator.clipboard.readText()

    if (Address.from(input) == null && !input.endsWith(".eth"))
      return

    setTarget(input)
    setStep("value")
  }, [setStep, setTarget])

  const [mode, setMode] = useState<"recents" | "contacts">("recents")

  const onRecentsClick = useCallback(() => {
    setMode("recents")
  }, [])

  const onContactsClick = useCallback(() => {
    setMode("contacts")
  }, [])

  const onBrumeClick = useCallback(() => {
    setTarget("brume.eth")
    setStep("value")
  }, [setStep, setTarget])

  return <>
    <Dialog.Title close={close}>
      Send
    </Dialog.Title>
    <div className="h-4" />
    <SimpleBox>
      <div className="">
        Target
      </div>
      <div className="w-4" />
      <SimpleInput key="target"
        autoFocus
        value={rawTargetInput}
        onChange={onTargetInputChange}
        onKeyDown={onEnter}
        placeholder="brume.eth" />
      <div className="w-1" />
      <div className="flex items-center">
        {rawTargetInput.length === 0
          ? <ShrinkableNakedButtonInInputBox
            onClick={onPaste}>
            <Outline.ClipboardIcon className="size-4" />
          </ShrinkableNakedButtonInInputBox>
          : <ShrinkableNakedButtonInInputBox
            onClick={onClear}>
            <Outline.XMarkIcon className="size-4" />
          </ShrinkableNakedButtonInInputBox>}
        <div className="w-1" />
        <ShrinkableContrastButtonInInputBox
          onClick={onSubmit}>
          OK
        </ShrinkableContrastButtonInInputBox>
      </div>
    </SimpleBox>
    {maybeEns != null && <>
      <div className="h-2" />
      <div className="po-md flex items-center bg-contrast rounded-xl cursor-pointer"
        role="button"
        onClick={onSubmit}>
        <div className="size-12 shrink-0 rounded-full bg-contrast" />
        <div className="w-4" />
        <div className="flex flex-col truncate">
          <div className="font-medium">
            {targetInput}
          </div>
          <div className="text-contrast truncate">
            {maybeEns}
          </div>
        </div>
      </div>
    </>}
    <div className="h-4" />
    <div className="flex items-center">
      <button className="text-lg font-medium text-contrast data-[active=true]:text-default"
        onClick={onRecentsClick}
        data-active={mode === "recents"}>
        Recents
      </button>
      <div className="grow" />
      <button className="text-contrast font-medium text-contrast data-[active=true]:text-default"
        onClick={onContactsClick}
        data-active={mode === "contacts"}>
        Contacts
      </button>
    </div>
    <div className="h-2" />
    <div className="po-md flex items-center bg-contrast rounded-xl cursor-pointer"
      role="button"
      onClick={onBrumeClick}>
      <img className="size-12 shrink-0 rounded-full bg-contrast"
        src="/square.png"
        alt="logo" />
      <div className="w-4" />
      <div className="flex flex-col truncate">
        <div className="font-medium">
          Brume Wallet
        </div>
        <div className="text-contrast truncate">
          brume.eth
        </div>
      </div>
    </div>
    <div className="grow flex flex-col items-center justify-center">
      Coming soon...
    </div>
  </>
}
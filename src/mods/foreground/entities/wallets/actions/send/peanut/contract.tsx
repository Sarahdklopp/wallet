import { TokenAbi } from "@/libs/abi/erc20.abi";
import { PeanutAbi } from "@/libs/abi/peanut.abi";
import { useCopy } from "@/libs/copy/copy";
import { chainByChainId, tokenByAddress } from "@/libs/ethereum/mods/chain";
import { Outline } from "@/libs/icons/icons";
import { Peanut } from "@/libs/peanut";
import { useInputChange } from "@/libs/react/events";
import { useConstant } from "@/libs/react/ref";
import { Dialog, Screen, useCloseContext } from "@/libs/ui/dialog/dialog";
import { qurl } from "@/libs/url/url";
import { useTransactionTrial, useTransactionWithReceipt } from "@/mods/foreground/entities/transactions/data";
import { PathContext, usePathState, useSearchState, useSubpath } from "@/mods/foreground/router/path/context";
import { Base16 } from "@hazae41/base16";
import { Bytes } from "@hazae41/bytes";
import { Abi, Address, Fixed, ZeroHexString } from "@hazae41/cubane";
import { Cursor } from "@hazae41/cursor";
import { Keccak256 } from "@hazae41/keccak256";
import { Nullable, Option, Optional } from "@hazae41/option";
import { Result } from "@hazae41/result";
import { Secp256k1 } from "@hazae41/secp256k1";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ShrinkableContrastButtonInInputBox, ShrinkableNakedButtonInInputBox, SimpleBox, SimpleInput, UrlState, WideShrinkableOppositeButton } from "..";
import { useNativeBalance, useNativePricedBalance, useToken } from "../../../../tokens/data";
import { useWalletDataContext } from "../../../context";
import { useEthereumContext2 } from "../../../data";
import { PriceResolver } from "../../../page";
import { WalletTransactionScreen } from "../../eth_sendTransaction";
import { TransactionCard } from "../../eth_sendTransaction/value";

export function WalletPeanutSendScreenContractValue(props: {}) {
  const wallet = useWalletDataContext().unwrap()
  const close = useCloseContext().unwrap()
  const subpath = useSubpath()

  const $state = usePathState<UrlState>()
  const [maybeStep, setStep] = useSearchState("step", $state)
  const [maybeChain, setChain] = useSearchState("chain", $state)
  const [maybeToken, setToken] = useSearchState("token", $state)
  const [maybeValue, setValue] = useSearchState("value", $state)
  const [maybePassword, setPassword] = useSearchState("password", $state)
  const [maybeTrial0, setTrial0] = useSearchState("trial0", $state)
  const [maybeTrial1, setTrial1] = useSearchState("trial1", $state)

  const trial0UuidFallback = useConstant(() => crypto.randomUUID())
  const trial0Uuid = Option.wrap(maybeTrial0).unwrapOr(trial0UuidFallback)

  useEffect(() => {
    if (maybeTrial0 === trial0Uuid)
      return
    setTrial0(trial0Uuid)
  }, [maybeTrial0, setTrial0, trial0Uuid])

  const trial1UuidFallback = useConstant(() => crypto.randomUUID())
  const trial1Uuid = Option.wrap(maybeTrial1).unwrapOr(trial1UuidFallback)

  useEffect(() => {
    if (maybeTrial1 === trial1Uuid)
      return
    setTrial1(trial1Uuid)
  }, [maybeTrial1, setTrial1, trial1Uuid])

  const chain = Option.unwrap(maybeChain)
  const chainData = chainByChainId[Number(chain)]

  const tokenQuery = useToken(chainData.chainId, maybeToken)
  const maybeTokenData = Option.wrap(tokenQuery.current?.ok().get())
  const maybeTokenDef = Option.wrap(tokenByAddress[maybeToken as any])
  const tokenData = maybeTokenData.or(maybeTokenDef).unwrap()

  const context = useEthereumContext2(wallet.uuid, chainData).unwrap()

  const [prices, setPrices] = useState<Nullable<Nullable<Fixed.From>[]>>(() => {
    if (tokenData.pairs == null)
      return
    return new Array(tokenData.pairs.length)
  })

  const onPrice = useCallback(([index, data]: [number, Nullable<Fixed.From>]) => {
    setPrices(prices => {
      if (prices == null)
        return
      prices[index] = data
      return [...prices]
    })
  }, [])

  const maybePrice = useMemo(() => {
    return prices?.reduce((a: Fixed, b: Nullable<Fixed.From>) => {
      if (b == null)
        return a
      return a.mul(Fixed.from(b))
    }, Fixed.unit(tokenData.decimals))
  }, [prices, tokenData])

  const [rawValuedInput = "", setRawValuedInput] = useState<Optional<string>>(maybeValue)
  const [rawPricedInput = "", setRawPricedInput] = useState<Optional<string>>()

  const valuedInput = useDeferredValue(rawValuedInput)

  const getRawPricedInput = useCallback((rawValuedInput: string) => {
    try {
      if (rawValuedInput.trim().length === 0)
        return undefined

      if (maybePrice == null)
        return undefined

      const priced = Fixed.fromString(rawValuedInput, tokenData.decimals).mul(maybePrice)

      if (priced.value === 0n)
        return undefined

      return priced.toString()
    } catch (e: unknown) {
      return undefined
    }
  }, [maybePrice, tokenData])

  const getRawValuedInput = useCallback((rawPricedInput: string) => {
    try {
      if (rawPricedInput.trim().length === 0)
        return undefined

      if (maybePrice == null)
        return undefined

      const valued = Fixed.fromString(rawPricedInput, tokenData.decimals).div(maybePrice)

      if (valued.value === 0n)
        return undefined

      return valued.toString()
    } catch (e: unknown) {
      return undefined
    }
  }, [maybePrice, tokenData])

  const onValuedChange = useCallback((input: string) => {
    setRawPricedInput(getRawPricedInput(input))
  }, [getRawPricedInput])

  const onPricedChange = useCallback((input: string) => {
    setRawValuedInput(getRawValuedInput(input))
  }, [getRawValuedInput])

  const setRawValued = useCallback((input: string) => {
    setRawValuedInput(input)
    onValuedChange(input)
  }, [onValuedChange])

  const setRawPriced = useCallback((input: string) => {
    setRawPricedInput(input)
    onPricedChange(input)
  }, [onPricedChange])

  const onValuedInputChange = useInputChange(e => {
    setRawValued(e.target.value)
  }, [setRawValued])

  const onPricedInputChange = useInputChange(e => {
    setRawPriced(e.target.value)
  }, [setRawPriced])

  useEffect(() => {
    if (maybePrice == null)
      return
    onValuedChange(valuedInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maybePrice])

  useEffect(() => {
    setValue(valuedInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuedInput])

  const [mode, setMode] = useState<"valued" | "priced">("valued")

  const valuedBalanceQuery = useNativeBalance(wallet.address, "pending", context, prices)
  const pricedBalanceQuery = useNativePricedBalance(wallet.address, "usd", context)

  const valuedBalanceData = valuedBalanceQuery.current?.ok().get()
  const pricedBalanceData = pricedBalanceQuery.current?.ok().get()

  const onValueMaxClick = useCallback(() => {
    if (valuedBalanceData == null)
      return
    setRawValued(Fixed.from(valuedBalanceData).toString())
  }, [valuedBalanceData, setRawValued])

  const onPricedMaxClick = useCallback(() => {
    if (pricedBalanceData == null)
      return
    setRawPriced(Fixed.from(pricedBalanceData).toString())
  }, [pricedBalanceData, setRawPriced])

  const onValuedPaste = useCallback(async () => {
    setRawValued(await navigator.clipboard.readText())
  }, [setRawValued])

  const onPricedPaste = useCallback(async () => {
    setRawPriced(await navigator.clipboard.readText())
  }, [setRawPriced])

  const onValuedClear = useCallback(async () => {
    setRawValued("")
  }, [setRawValued])

  const onPricedClear = useCallback(async () => {
    setRawPriced("")
  }, [setRawPriced])

  const onTargetFocus = useCallback(() => {
    setStep("target")
  }, [setStep])

  const onPricedClick = useCallback(() => {
    setMode("priced")
  }, [])

  const onValuedClick = useCallback(() => {
    setMode("valued")
  }, [])

  const maybeContract = useMemo(() => {
    return Peanut.contracts[chainData.chainId]?.v4 as ZeroHexString | undefined
  }, [chainData])

  const password = useMemo(() => {
    if (maybePassword != null)
      return maybePassword

    const byte = new Uint8Array(1)
    const bytes = new Uint8Array(32)
    const cursor = new Cursor(bytes)

    function isAlphanumeric(byte: number) {
      if (byte >= 97 /*a*/ && byte <= 122 /*z*/)
        return true
      if (byte >= 65 /*A*/ && byte <= 90 /*Z*/)
        return true
      if (byte >= 48 /*0*/ && byte <= 57 /*9*/)
        return true
      return false
    }

    while (cursor.remaining) {
      if (!isAlphanumeric(crypto.getRandomValues(byte)[0]))
        continue
      cursor.writeOrThrow(byte)
    }

    return Bytes.toUtf8(bytes)
  }, [maybePassword])

  useEffect(() => {
    if (maybePassword === password)
      return
    setPassword(password)
  }, [maybePassword, password, setPassword])

  const rawValue = useMemo(() => {
    return maybeValue?.trim().length
      ? maybeValue.trim()
      : "0"
  }, [maybeValue])

  const maybeFinalValue = useMemo(() => {
    try {
      return Fixed.fromString(rawValue, tokenData.decimals)
    } catch { }
  }, [rawValue, tokenData])

  const maybeTriedMaybeFinalData1 = useMemo(() => {
    if (maybeContract == null)
      return undefined
    if (maybeFinalValue == null)
      return undefined

    return Result.runAndDoubleWrapSync(() => {
      const abi = TokenAbi.approve.from(maybeContract, maybeFinalValue.value)
      const hex = Abi.encodeOrThrow(abi)

      return hex
    })
  }, [maybeContract, maybeFinalValue])

  const onSendTransaction1Click = useCallback(() => {
    subpath.go(qurl("/eth_sendTransaction", { trial: trial1Uuid, step: "value", chain: chainData.chainId, target: tokenData.address, data: maybeTriedMaybeFinalData1?.ok().get(), disableTarget: true, disableValue: true, disableData: true, disableSign: true }))
  }, [subpath, trial1Uuid, chainData, tokenData, maybeTriedMaybeFinalData1])

  const maybeTriedMaybeFinalData0 = useMemo(() => {
    if (maybeFinalValue == null)
      return undefined

    return Result.runAndDoubleWrapSync(() => {
      const token = tokenData.address
      const value = maybeFinalValue.value

      const passwordBytes = Bytes.fromUtf8(password)
      const hashSlice = Keccak256.get().hashOrThrow(passwordBytes)
      const privateKey = Secp256k1.get().PrivateKey.tryImport(hashSlice).unwrap()
      const publicKey = privateKey.tryGetPublicKey().unwrap().tryExportUncompressed().unwrap().copyAndDispose()
      const address = Address.compute(publicKey)

      const abi = PeanutAbi.makeDeposit.from(token, 1, value, 0, address)
      const hex = Abi.encodeOrThrow(abi)

      return hex
    })
  }, [maybeFinalValue, password, tokenData])

  const onSendTransaction0Click = useCallback(() => {
    subpath.go(qurl("/eth_sendTransaction", { trial: trial0Uuid, step: "value", chain: chainData.chainId, target: maybeContract, data: maybeTriedMaybeFinalData0?.ok().get(), disableTarget: true, disableValue: true, disableData: true, disableSign: true }))
  }, [subpath, trial0Uuid, chainData, maybeContract, maybeTriedMaybeFinalData0])

  const onClose = useCallback(() => {
    subpath.go(`/`)
  }, [subpath])

  const trial1Query = useTransactionTrial(trial1Uuid)
  const maybeTrial1Data = trial1Query.current?.ok().get()

  const transaction1Query = useTransactionWithReceipt(maybeTrial1Data?.transactions[0].uuid, context)
  const maybeTransaction1 = transaction1Query.current?.ok().get()

  const trial0Query = useTransactionTrial(trial0Uuid)
  const maybeTrial0Data = trial0Query.current?.ok().get()

  const transaction0Query = useTransactionWithReceipt(maybeTrial0Data?.transactions[0].uuid, context)
  const maybeTransaction0 = transaction0Query.current?.ok().get()

  const maybeTriedLink = useMemo(() => {
    if (maybeTransaction0 == null)
      return
    if (maybeTransaction0.type !== "executed")
      return

    return Result.runAndDoubleWrapSync(() => {
      const signatureUtf8 = "DepositEvent(uint256,uint8,uint256,address)"
      const signatureBytes = Bytes.fromUtf8(signatureUtf8)

      using hashSlice = Keccak256.get().hashOrThrow(signatureBytes)
      const hashHex = `0x${Base16.get().encodeOrThrow(hashSlice)}`

      const log = maybeTransaction0.receipt.logs.find(log => log.topics[0] === hashHex)

      if (log == null)
        throw new Error(`Could not find log`)

      const index = BigInt(log.topics[1])

      return `https://peanut.to/claim?c=${chainData.chainId}&i=${index}&v=v4&t=ui#p=${password}`
    })
  }, [maybeTransaction0, password, chainData.chainId])

  const onLinkCopy = useCopy(maybeTriedLink?.ok().inner)

  return <>
    <PathContext.Provider value={subpath}>
      {subpath.url.pathname === "/eth_sendTransaction" &&
        <Screen close={onClose}>
          <WalletTransactionScreen />
        </Screen>}
    </PathContext.Provider>
    {tokenData.pairs?.map((address, i) =>
      <PriceResolver key={i}
        index={i}
        address={address}
        ok={onPrice} />)}
    <Dialog.Title close={close}>
      Send {tokenData.symbol} on {chainData.name}
    </Dialog.Title>
    <div className="h-4" />
    <SimpleBox>
      <div className="">
        Target
      </div>
      <div className="w-4" />
      <SimpleInput key="target"
        readOnly
        onFocus={onTargetFocus}
        value="Peanut" />
    </SimpleBox>
    <div className="h-2" />
    {mode === "valued" &&
      <SimpleBox>
        <div className="">
          Value
        </div>
        <div className="w-4" />
        <div className="grow flex flex-col overflow-hidden">
          <div className="flex items-center">
            <SimpleInput
              autoFocus
              value={rawValuedInput}
              onChange={onValuedInputChange}
              placeholder="0.0" />
            <div className="w-1" />
            <div className="text-contrast">
              {tokenData.symbol}
            </div>
          </div>
          <div className="flex items-center cursor-pointer"
            role="button"
            onClick={onPricedClick}>
            <div className="text-contrast truncate">
              {rawPricedInput || "0.0"}
            </div>
            <div className="grow" />
            <div className="text-contrast">
              USD
            </div>
          </div>
        </div>
        <div className="w-2" />
        <div className="flex items-center">
          {rawValuedInput.length === 0
            ? <ShrinkableNakedButtonInInputBox
              onClick={onValuedPaste}>
              <Outline.ClipboardIcon className="size-4" />
            </ShrinkableNakedButtonInInputBox>
            : <ShrinkableNakedButtonInInputBox
              onClick={onValuedClear}>
              <Outline.XMarkIcon className="size-4" />
            </ShrinkableNakedButtonInInputBox>}
          <div className="w-1" />
          <ShrinkableContrastButtonInInputBox
            disabled={valuedBalanceQuery.data == null}
            onClick={onValueMaxClick}>
            100%
          </ShrinkableContrastButtonInInputBox>
        </div>
      </SimpleBox>}
    {mode === "priced" &&
      <SimpleBox>
        <div className="">
          Value
        </div>
        <div className="w-4" />
        <div className="grow flex flex-col overflow-hidden">
          <div className="flex items-center">
            <SimpleInput
              autoFocus
              value={rawPricedInput}
              onChange={onPricedInputChange}
              placeholder="0.0" />
            <div className="w-1" />
            <div className="text-contrast">
              USD
            </div>
          </div>
          <div className="flex items-center cursor-pointer"
            role="button"
            onClick={onValuedClick}>
            <div className="text-contrast truncate">
              {rawValuedInput || "0.0"}
            </div>
            <div className="grow" />
            <div className="text-contrast">
              {tokenData.symbol}
            </div>
          </div>
        </div>
        <div className="w-2" />
        <div className="flex items-center">
          {rawPricedInput.length === 0
            ? <ShrinkableNakedButtonInInputBox
              onClick={onPricedPaste}>
              <Outline.ClipboardIcon className="size-4" />
            </ShrinkableNakedButtonInInputBox>
            : <ShrinkableNakedButtonInInputBox
              onClick={onPricedClear}>
              <Outline.XMarkIcon className="size-4" />
            </ShrinkableNakedButtonInInputBox>}
          <div className="w-1" />
          <ShrinkableContrastButtonInInputBox
            disabled={pricedBalanceQuery.data == null}
            onClick={onPricedMaxClick}>
            100%
          </ShrinkableContrastButtonInInputBox>
        </div>
      </SimpleBox>}
    <div className="h-4" />
    {maybeTransaction1 != null && <>
      <div className="font-medium">
        Approval
      </div>
      <div className="h-2" />
      <TransactionCard
        data={maybeTransaction1}
        onSend={() => { }}
        onRetry={() => { }} />
      <div className="h-4" />
    </>}
    {maybeTransaction0 != null && <>
      <div className="font-medium">
        Deposit
      </div>
      <div className="h-2" />
      <TransactionCard
        data={maybeTransaction0}
        onSend={() => { }}
        onRetry={() => { }} />
      <div className="h-4" />
    </>}
    <div className="h-4 grow" />
    {maybeTriedLink?.isOk() && <>
      <div className="po-md flex items-center bg-contrast rounded-xl">
        <div className="flex flex-col truncate">
          <div className="flex items-center">
            <div className="font-medium">
              Link created
            </div>
          </div>
          <div className="text-contrast truncate">
            {maybeTriedLink.get()}
          </div>
          <div className="h-2" />
          <div className="flex items-center gap-1">
            <button className="group px-2 bg-contrast rounded-full outline-none disabled:opacity-50 transition-opacity"
              onClick={onLinkCopy.run}>
              <div className="h-full w-full flex items-center justify-center gap-2 group-active:scale-90 transition-transform">
                Copy
                {onLinkCopy.current
                  ? <Outline.CheckIcon className="size-4" />
                  : <Outline.ClipboardIcon className="size-4" />}
              </div>
            </button>
            <a className="group px-2 bg-contrast rounded-full"
              target="_blank" rel="noreferrer"
              href={maybeTriedLink.get()}>
              <div className="h-full w-full flex items-center justify-center gap-2 group-active:scale-90 transition-transform">
                Open
                <Outline.ArrowTopRightOnSquareIcon className="size-4" />
              </div>
            </a>
          </div>
        </div>
      </div>
      <div className="h-2" />
      <div className="flex items-center">
        <WideShrinkableOppositeButton
          onClick={close}>
          <Outline.CheckIcon className="size-5" />
          Close
        </WideShrinkableOppositeButton>
      </div>
    </>}
    {maybeTransaction1 == null &&
      <div className="flex items-center">
        <WideShrinkableOppositeButton
          onClick={onSendTransaction1Click}>
          <Outline.PaperAirplaneIcon className="size-5" />
          Transact (1/2)
        </WideShrinkableOppositeButton>
      </div>}
    {maybeTransaction1?.type === "executed" && maybeTransaction0 == null &&
      <div className="flex items-center">
        <WideShrinkableOppositeButton
          onClick={onSendTransaction0Click}>
          <Outline.PaperAirplaneIcon className="size-5" />
          Transact (2/2)
        </WideShrinkableOppositeButton>
      </div>}
  </>
}
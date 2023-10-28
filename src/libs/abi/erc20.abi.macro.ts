import { $parse$ } from "./macros/parse";

function $pre$() {
  return `import { Cubane } from "@hazae41/cubane"`
}

$pre$()

export namespace TokenAbi {
  export const balanceOf = $parse$("balanceOf(address)")
}
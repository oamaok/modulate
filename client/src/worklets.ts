import { Worklets, workletNames } from './generated/worklets'
export { Worklets, workletNames }

export type WorkletName = typeof workletNames[number]

export type WorkletParameters<T extends WorkletName> = Worklets[T] extends {
  parameterDescriptors?: infer ParamDefs
}
  ? ParamDefs extends { [key: number]: infer ParamDef }
    ? ParamDef extends { name: infer ParamName }
      ? ParamName
      : never
    : never
  : never

export type WorkletNode<T extends WorkletName> = AudioWorkletNode & {
  parameters: {
    get(parameter: WorkletParameters<T>): AudioParam
  }
}

export const WorkletNode: {
  new <T extends WorkletName>(
    context: AudioContext,
    workletName: T,
    options?: AudioWorkletNodeOptions
  ): WorkletNode<T>
} = AudioWorkletNode as any

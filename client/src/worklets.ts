import { Modules } from '@modulate/worklets/src/modules'

type WorkletName = Modules['name']
type WorkletParameterDescriptors<T extends WorkletName> = Extract<
  Modules,
  { name: T }
>['parameterDescriptors']
type WorkletParameters<T extends WorkletName> =
  WorkletParameterDescriptors<T> extends readonly { name: infer Name }[]
    ? Name
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

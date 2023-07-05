import init, { workerEntry } from '../pkg/worklets'

self.onmessage = async (
  event: MessageEvent<[WebAssembly.Module, WebAssembly.Memory, number]>
) => {
  await init(event.data[0], event.data[1])
  self.postMessage('done')
  workerEntry(event.data[2])
}

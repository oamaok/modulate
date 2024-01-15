import init, { workerEntry } from '../pkg/worklets'

self.onmessage = async (
  event: MessageEvent<[WebAssembly.Module, WebAssembly.Memory, number]>
) => {
  try {
    await init(event.data[0], event.data[1])
    self.postMessage(null)
    workerEntry(event.data[2])
  } catch (err) {
    self.postMessage(err)
  }
}

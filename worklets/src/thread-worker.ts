import { initSync, workerEntry } from '../pkg/modulate'

self.onmessage = async (
  event: MessageEvent<[WebAssembly.Module, WebAssembly.Memory, number]>
) => {
  try {
    initSync({ module: event.data[0], memory: event.data[1] })
    self.postMessage(null)
    workerEntry(event.data[2])
  } catch (err) {
    self.postMessage(err)
  }
}

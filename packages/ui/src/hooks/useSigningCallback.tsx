// import { ISubmittableResult } from '@polkadot/types/types'
import { useApi } from '../contexts/ApiContext'
import { useGetSubscanLinks } from './useSubscanLink'
import { useToasts } from '../contexts/ToastContext'
// import { getIncompleteMessage } from '../utils/extinsicErrorChecks'
// import { EventRecord } from '@polkadot/types/interfaces'
import { TxEvent } from 'polkadot-api'

interface Args {
  onSubmitting?: () => void
  onSuccess?: () => void
  onError?: (message?: string) => void
  onFinalized?: () => void
}

export const useSigningCallback = ({ onSubmitting, onSuccess, onFinalized, onError }: Args) => {
  const { addToast } = useToasts()
  const { api } = useApi()
  const { getSubscanExtrinsicLink } = useGetSubscanLinks()

  return (event: TxEvent) => {
    onSubmitting && onSubmitting()
    console.log('Transaction hash:', event.txHash)
    const link = getSubscanExtrinsicLink(event.txHash)

    if (event.type === 'broadcasted') {
      addToast({ title: `Tx broadcasted`, type: 'loading', link })
    }

    let errorInfo = ''
    let toastErrorShown = false

    if (!api) {
      return
    }

    if (event.type === 'txBestBlocksState' && event.found) {
      if (event.dispatchError) {
        console.log('DispatchError', event.dispatchError)

        if (
          event.dispatchError.type === 'Module' &&
          !!(event.dispatchError.value as any)?.value?.type
        ) {
          errorInfo = (event.dispatchError.value as any)?.value?.type
        }
      }

      event.events.forEach((event) => {
        console.log(JSON.stringify(event, (_, v) => (typeof v === 'bigint' ? v.toString() : v)))

        // interrupted batch
        if (event.type === 'Utility' && event.value.type === 'BatchInterrupted') {
          errorInfo = event.value.value.error.type
        }

        // if it's a success and there's been no error nested in
        if (event.type === 'System' && event.value.type === 'ExtrinsicSuccess') {
          !errorInfo &&
            !toastErrorShown &&
            addToast({ title: 'Tx in block', type: 'success', link })
          onSuccess && onSuccess()
        }
      })

      if (!!errorInfo && !toastErrorShown) {
        addToast({ title: errorInfo, type: 'error', link })
        onError && onError(errorInfo)
        // prevent showing several errors
        toastErrorShown = true
      }
    }

    if (event.type === 'finalized') {
      console.log('finalized:', event)
      onFinalized && onFinalized()

      // event.events.forEach(({type, value}) => {
      // const { data, method, section } = event

      // console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString())

      // const incomplete = getIncompleteMessage({ event } as EventRecord)

      // // check if multisig or proxy or batch has an error
      // if (incomplete) {
      //   errorInfo = incomplete
      // }

      // if the extrinsic fails alltogether
      // if (!errorInfo && api.events.system.ExtrinsicFailed.is(event)) {
      //   // extract the data for this event
      //   const dispatchError = data[0]

      //   // decode the error
      //   if ((dispatchError as any).isModule) {
      //     // for module errors, we have the section indexed, lookup
      //     // (For specific known errors, we can also do a check against the
      //     // api.errors.<module>.<ErrorName>.is(dispatchError.asModule) guard)
      //     const decoded = api.registry.findMetaError((dispatchError as any).asModule)

      //     errorInfo = `${decoded.docs} - ${decoded.section}.${decoded.name}`
      //   } else {
      //     // Other, CannotLookup, BadOrigin, no extra info
      //     errorInfo = dispatchError.toString()
      //   }
      // }
      // })
    }
  }
}

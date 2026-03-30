import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

interface ConfirmOptions {
  title?: string
  text?: string
  icon?: 'warning' | 'error' | 'success' | 'info' | 'question'
  confirmButtonText?: string
  cancelButtonText?: string
  confirmButtonColor?: string
  cancelButtonColor?: string
  reverseButtons?: boolean
}

/**
 * A beautiful, themed confirmation dialog that replaces the native window.confirm().
 */
export const confirmDialog = async (options: ConfirmOptions = {}) => {
  const {
    title = 'Are you sure?',
    text = "You won't be able to revert this!",
    icon = 'warning',
    confirmButtonText = 'Yes, proceed!',
    cancelButtonText = 'Cancel',
    confirmButtonColor = '#0284c7', // primary-600
    cancelButtonColor = '#ef4444', // red-500
    reverseButtons = true,
  } = options

  const result = await MySwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonColor,
    cancelButtonColor,
    confirmButtonText,
    cancelButtonText,
    reverseButtons,
    customClass: {
      popup: 'rounded-2xl border border-gray-100 shadow-xl p-6 sm:p-8',
      title: 'text-xl sm:text-2xl font-bold text-gray-900 mb-2',
      htmlContainer: 'text-sm sm:text-base text-gray-500 font-medium leading-relaxed',
      confirmButton: 'px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg active:scale-95 outline-none focus:ring-2 focus:ring-primary-100',
      cancelButton: 'px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all outline-none focus:ring-2 focus:ring-gray-100 ml-3',
    },
    buttonsStyling: false,
    showClass: {
      popup: 'animate__animated animate__fadeInDown animate__faster'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp animate__faster'
    }
  })

  return result.isConfirmed
}

/**
 * Shortcut for delete confirmations
 */
export const confirmDelete = async (itemType: string = 'this item', details?: string) => {
  return confirmDialog({
    title: `Delete ${itemType}?`,
    text: details || `Are you sure you want to delete this ${itemType}? This action cannot be undone.`,
    icon: 'warning',
    confirmButtonText: 'Yes, delete it!',
    confirmButtonColor: '#dc2626', // bg-red-600
  })
}

/**
 * Shortcut for approval confirmations
 */
export const confirmAction = async (title: string, text: string) => {
  return confirmDialog({
    title,
    text,
    icon: 'question',
    confirmButtonText: 'Confirm',
    confirmButtonColor: '#16a34a', // bg-green-600
  })
}

import { useEffect } from 'react'
import { toast as showToast } from '@course-anchor/ui/components/sonner'
import type { Toast } from '~/lib/toast.server'

export function useToast(toast?: Toast | null) {
	useEffect(() => {
		if (toast) {
			setTimeout(() => {
				showToast[toast.type](toast.title, {
					id: toast.id,
					description: toast.description,
				})
			}, 0)
		}
	}, [toast])
}

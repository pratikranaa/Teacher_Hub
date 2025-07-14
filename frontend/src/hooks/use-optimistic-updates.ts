import { useState, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

interface OptimisticUpdate<T> {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  data: T
  originalData?: T
}

interface UseOptimisticUpdatesOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error, rollbackData?: T) => void
  timeout?: number
}

export function useOptimisticUpdates<T>(
  initialData: T[],
  options: UseOptimisticUpdatesOptions<T> = {}
) {
  const [data, setData] = useState<T[]>(initialData)
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map())
  const { toast } = useToast()
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const { onSuccess, onError, timeout = 5000 } = options

  const applyOptimisticUpdate = useCallback((update: OptimisticUpdate<T>) => {
    const updateId = `${update.type}_${update.id}_${Date.now()}`
    
    // Apply optimistic update immediately
    setData(currentData => {
      switch (update.type) {
        case 'CREATE':
          return [...currentData, update.data]
        case 'UPDATE':
          return currentData.map(item => 
            (item as any).id === update.id ? update.data : item
          )
        case 'DELETE':
          return currentData.filter(item => (item as any).id !== update.id)
        default:
          return currentData
      }
    })

    // Track pending update
    setPendingUpdates(prev => new Map(prev).set(updateId, update))

    // Set timeout for rollback if needed
    const timeoutId = setTimeout(() => {
      rollbackUpdate(updateId, new Error('Request timeout'))
    }, timeout)
    
    timeoutRefs.current.set(updateId, timeoutId)

    return updateId
  }, [timeout])

  const confirmUpdate = useCallback((updateId: string, serverData?: T) => {
    const update = pendingUpdates.get(updateId)
    if (!update) return

    // Clear timeout
    const timeoutId = timeoutRefs.current.get(updateId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutRefs.current.delete(updateId)
    }

    // Remove from pending
    setPendingUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(updateId)
      return newMap
    })

    // Update with server data if provided
    if (serverData && update.type !== 'DELETE') {
      setData(currentData => 
        currentData.map(item => 
          (item as any).id === update.id ? serverData : item
        )
      )
    }

    onSuccess?.(serverData || update.data)
  }, [pendingUpdates, onSuccess])

  const rollbackUpdate = useCallback((updateId: string, error: Error) => {
    const update = pendingUpdates.get(updateId)
    if (!update) return

    // Clear timeout
    const timeoutId = timeoutRefs.current.get(updateId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutRefs.current.delete(updateId)
    }

    // Rollback the optimistic update
    setData(currentData => {
      switch (update.type) {
        case 'CREATE':
          return currentData.filter(item => (item as any).id !== update.id)
        case 'UPDATE':
          if (update.originalData) {
            return currentData.map(item => 
              (item as any).id === update.id ? update.originalData! : item
            )
          }
          return currentData
        case 'DELETE':
          if (update.originalData) {
            return [...currentData, update.originalData]
          }
          return currentData
        default:
          return currentData
      }
    })

    // Remove from pending
    setPendingUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(updateId)
      return newMap
    })

    // Show error toast
    toast({
      title: "Action Failed",
      description: error.message || "Something went wrong. Please try again.",
      variant: "destructive"
    })

    onError?.(error, update.originalData)
  }, [pendingUpdates, toast, onError])

  const optimisticCreate = useCallback(async (
    newItem: T,
    apiCall: () => Promise<T>
  ) => {
    const updateId = applyOptimisticUpdate({
      id: (newItem as any).id || Date.now().toString(),
      type: 'CREATE',
      data: newItem
    })

    try {
      const result = await apiCall()
      confirmUpdate(updateId, result)
      return result
    } catch (error) {
      rollbackUpdate(updateId, error as Error)
      throw error
    }
  }, [applyOptimisticUpdate, confirmUpdate, rollbackUpdate])

  const optimisticUpdate = useCallback(async (
    id: string,
    updatedItem: T,
    apiCall: () => Promise<T>
  ) => {
    // Find original data for rollback
    const originalItem = data.find(item => (item as any).id === id)
    
    const updateId = applyOptimisticUpdate({
      id,
      type: 'UPDATE',
      data: updatedItem,
      originalData: originalItem
    })

    try {
      const result = await apiCall()
      confirmUpdate(updateId, result)
      return result
    } catch (error) {
      rollbackUpdate(updateId, error as Error)
      throw error
    }
  }, [data, applyOptimisticUpdate, confirmUpdate, rollbackUpdate])

  const optimisticDelete = useCallback(async (
    id: string,
    apiCall: () => Promise<void>
  ) => {
    // Find original data for rollback
    const originalItem = data.find(item => (item as any).id === id)
    
    const updateId = applyOptimisticUpdate({
      id,
      type: 'DELETE',
      data: {} as T, // Not used for delete
      originalData: originalItem
    })

    try {
      await apiCall()
      confirmUpdate(updateId)
    } catch (error) {
      rollbackUpdate(updateId, error as Error)
      throw error
    }
  }, [data, applyOptimisticUpdate, confirmUpdate, rollbackUpdate])

  const isPending = useCallback((id: string) => {
    return Array.from(pendingUpdates.values()).some(update => update.id === id)
  }, [pendingUpdates])

  const getPendingCount = useCallback(() => {
    return pendingUpdates.size
  }, [pendingUpdates])

  return {
    data,
    setData,
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
    isPending,
    getPendingCount,
    pendingUpdates: Array.from(pendingUpdates.values())
  }
} 
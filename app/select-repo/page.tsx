'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Repo {
  id: number
  name: string
  full_name: string
  owner: {
    login: string
  }
  description: string | null
  private: boolean
  default_branch: string
}

export default function SelectRepo() {
  const router = useRouter()
  const [repos, setRepos] = useState<Repo[]>([])
  const [filteredRepos, setFilteredRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    fetchRepos()
  }, [])

  useEffect(() => {
    if (search) {
      const filtered = repos.filter(repo =>
        repo.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (repo.description?.toLowerCase() || '').includes(search.toLowerCase())
      )
      setFilteredRepos(filtered)
    } else {
      setFilteredRepos(repos)
    }
  }, [search, repos])

  const fetchRepos = async () => {
    try {
      const response = await fetch('/api/repos/list')

      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }

      const data = await response.json()
      setRepos(data.repos)
      setFilteredRepos(data.repos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRepo = async (repo: Repo) => {
    setSelecting(repo.full_name)
    setError('')

    try {
      const response = await fetch('/api/repo/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repo.owner.login,
          repo: repo.name,
          branch: repo.default_branch,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to select repository')
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setSelecting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading repositories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Select Repository
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose a repository to explore with Basalt
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredRepos.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {search ? 'No repositories found matching your search' : 'No repositories available'}
              </div>
            ) : (
              filteredRepos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => handleSelectRepo(repo)}
                  disabled={selecting === repo.full_name}
                  className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {repo.full_name}
                        </span>
                        {repo.private && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
                            Private
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Branch: {repo.default_branch}
                      </p>
                    </div>
                    {selecting === repo.full_name && (
                      <div className="ml-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Showing {filteredRepos.length} of {repos.length} repositories
          </div>
        </div>
      </div>
    </div>
  )
}

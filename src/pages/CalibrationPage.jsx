// ─── FILE: src/pages/CalibrationPage.jsx ──────────────────────────
// PURPOSE: Calibration instructions and video library. Admins can
//          upload calibration videos; all users can view them.
// DEPENDENCIES: React, supabase (for video metadata storage)
// CALLED BY: React Router in src/main.jsx

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase.js'

// ─── Icons ───
const IconVideo = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
const IconUpload = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
const IconPlay = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconX = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconInfo = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1.5px solid var(--c-border)',
  borderRadius: '7px', fontSize: '14px', fontFamily: 'inherit',
  background: 'var(--c-input-bg)', color: 'var(--c-text)', outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--c-text-dim)',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px',
}

// Calibration steps for the quick-reference guide
const calibrationSteps = [
  {
    step: 1,
    title: 'Prepare the Surface',
    description: 'Ensure the vehicle is on a flat, level surface. Use a spirit level to verify. Remove any debris from under the tires.',
  },
  {
    step: 2,
    title: 'Mount the Aligntech Unit',
    description: 'Attach the unit securely to the wheel rim using the provided clamps. Ensure the unit is level and firmly seated.',
  },
  {
    step: 3,
    title: 'Zero the Sensors',
    description: 'With the unit mounted, press the calibration button to zero all sensors. Wait for the green confirmation LED.',
  },
  {
    step: 4,
    title: 'Verify Reference Points',
    description: 'Check that the laser reference lines align with the marked reference points on the calibration target.',
  },
  {
    step: 5,
    title: 'Run Self-Test',
    description: 'Initiate the self-test sequence from the app. All sensors should return "PASS" status before proceeding.',
  },
  {
    step: 6,
    title: 'Begin Diagnostic Session',
    description: 'Once calibration is confirmed, proceed to the New Report page to begin recording measurements.',
  },
]

export default function CalibrationPage() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', file: null })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [playingVideo, setPlayingVideo] = useState(null)
  const [toast, setToast] = useState({ message: '', visible: false, type: 'success' })
  const fileInputRef = useRef(null)

  const userRole = localStorage.getItem('userRole') || 'technician'
  const isAdmin = userRole === 'admin'

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ message: msg, visible: true, type })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800)
  }, [])

  // Load videos from Supabase
  const loadVideos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('calibration_videos')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setVideos(data || [])
    } catch {
      // Table may not exist yet — show empty state
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadVideos() }, [loadVideos])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid video file (MP4, WebM, MOV, AVI)', 'error')
      return
    }

    // Max 500MB
    if (file.size > 500 * 1024 * 1024) {
      showToast('Video must be under 500MB', 'error')
      return
    }

    setUploadForm(prev => ({ ...prev, file }))
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadForm.title || !uploadForm.file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const file = uploadForm.file
      const ext = file.name.split('.').pop()
      const fileName = `calibration_${Date.now()}.${ext}`

      // Upload to Supabase Storage
      setUploadProgress(20)
      const { error: uploadError } = await supabase.storage
        .from('calibration-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError
      setUploadProgress(70)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('calibration-videos')
        .getPublicUrl(fileName)

      // Save metadata to database
      const { error: dbError } = await supabase.from('calibration_videos').insert({
        title: uploadForm.title,
        description: uploadForm.description,
        file_name: fileName,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: localStorage.getItem('technicianName') || 'Admin',
        sort_order: videos.length,
      })

      if (dbError) throw dbError
      setUploadProgress(100)

      showToast('Video uploaded successfully')
      setUploadForm({ title: '', description: '', file: null })
      setShowUpload(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadVideos()
    } catch (err) {
      console.error('Upload failed:', err)
      showToast('Upload failed — check storage configuration', 'error')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteVideo = async (video) => {
    if (!confirm(`Delete "${video.title}"? This cannot be undone.`)) return

    try {
      // Delete from storage
      await supabase.storage.from('calibration-videos').remove([video.file_name])
      // Delete metadata
      await supabase.from('calibration_videos').delete().eq('id', video.id)
      showToast('Video deleted')
      await loadVideos()
      if (playingVideo?.id === video.id) setPlayingVideo(null)
    } catch {
      showToast('Delete failed', 'error')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="animate-in" style={{ maxWidth: '900px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--c-amber)' }}><IconVideo /></span>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Calibration</h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--c-text-dim)', lineHeight: 1.5 }}>
            Follow the calibration procedure before starting a diagnostic session.
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowUpload(!showUpload)} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', border: 'none', borderRadius: '8px',
            background: 'var(--c-amber)', color: '#1a1a1a',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <IconUpload /> Upload Video
          </button>
        )}
      </div>

      {/* ─── Admin Upload Form ─── */}
      {isAdmin && showUpload && (
        <div className="animate-in" style={{
          background: 'var(--c-surface)', border: '1px solid var(--c-amber)',
          borderRadius: '12px', padding: '20px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Upload Calibration Video</h3>
            <button onClick={() => setShowUpload(false)} style={{
              background: 'none', border: 'none', color: 'var(--c-text-dim)', cursor: 'pointer', padding: '4px',
            }}><IconX /></button>
          </div>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Video Title *</label>
              <input type="text" required value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g. Sensor Calibration Procedure" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea rows={2} value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Brief description of what this video covers..."
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={labelStyle}>Video File * (MP4, WebM, MOV — max 500MB)</label>
              <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                onChange={handleFileSelect}
                style={{
                  ...inputStyle, padding: '8px', cursor: 'pointer',
                  background: 'var(--c-surface-raised)',
                }} />
              {uploadForm.file && (
                <p style={{ fontSize: '12px', color: 'var(--c-text-dim)', marginTop: '4px' }}>
                  Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                </p>
              )}
            </div>
            {uploading && (
              <div style={{ background: 'var(--c-surface-raised)', borderRadius: '6px', overflow: 'hidden', height: '8px' }}>
                <div style={{
                  height: '100%', background: 'var(--c-amber)', borderRadius: '6px',
                  width: `${uploadProgress}%`, transition: 'width 0.3s ease',
                }} />
              </div>
            )}
            <button type="submit" disabled={uploading || !uploadForm.file || !uploadForm.title} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px 20px', border: 'none', borderRadius: '8px',
              background: 'var(--c-amber)', color: '#1a1a1a',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              opacity: (uploading || !uploadForm.file || !uploadForm.title) ? 0.5 : 1,
            }}>
              <IconUpload /> {uploading ? `Uploading ${uploadProgress}%...` : 'Upload Video'}
            </button>
          </form>
        </div>
      )}

      {/* ─── Video Player (if video selected) ─── */}
      {playingVideo && (
        <div className="animate-in" style={{
          background: '#000', borderRadius: '12px', overflow: 'hidden',
          marginBottom: '20px', position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.8)' }}>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{playingVideo.title}</span>
            <button onClick={() => setPlayingVideo(null)} style={{
              background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px',
            }}><IconX /></button>
          </div>
          <video
            src={playingVideo.file_url}
            controls autoPlay
            style={{ width: '100%', maxHeight: '500px', display: 'block' }}
          />
        </div>
      )}

      {/* ─── Quick Reference: Calibration Steps ─── */}
      <div style={{
        background: 'var(--c-surface)', border: '1px solid var(--c-border)',
        borderRadius: '12px', padding: '24px', marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--c-green)' }}><IconInfo /></span>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Calibration Procedure</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {calibrationSteps.map((cs) => (
            <div key={cs.step} style={{
              display: 'flex', gap: '14px', padding: '14px',
              borderRadius: '10px', background: 'var(--c-surface-raised)',
              border: '1px solid var(--c-border)',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--c-green-dim)', color: 'var(--c-green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 800, flexShrink: 0,
              }}>
                {cs.step}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{cs.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--c-text-dim)', lineHeight: 1.5 }}>{cs.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Uploaded Videos Library ─── */}
      <div style={{
        background: 'var(--c-surface)', border: '1px solid var(--c-border)',
        borderRadius: '12px', padding: '24px', marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--c-amber)' }}><IconPlay /></span>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Calibration Videos</h2>
          <span style={{ fontSize: '12px', color: 'var(--c-text-dim)', fontWeight: 600 }}>
            ({videos.length} {videos.length === 1 ? 'video' : 'videos'})
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--c-text-dim)' }}>
            <p className="pulse" style={{ fontSize: '14px', fontWeight: 600 }}>Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            background: 'var(--c-surface-raised)', borderRadius: '10px',
            border: '1px dashed var(--c-border)',
          }}>
            <span style={{ color: 'var(--c-text-dim)', display: 'block', marginBottom: '8px' }}><IconVideo /></span>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-text-dim)', marginBottom: '4px' }}>
              No calibration videos uploaded yet
            </p>
            <p style={{ fontSize: '12px', color: 'var(--c-text-dim)', opacity: 0.7 }}>
              {isAdmin ? 'Use the Upload Video button above to add calibration guides.' : 'Contact your administrator to upload calibration videos.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {videos.map((video) => (
              <div key={video.id} style={{
                borderRadius: '10px', border: '1px solid var(--c-border)',
                background: 'var(--c-surface-raised)', overflow: 'hidden',
                cursor: 'pointer', transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--c-amber)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--c-border)'}
              >
                {/* Video thumbnail / play area */}
                <div onClick={() => setPlayingVideo(video)} style={{
                  height: '140px', background: '#1a1a2e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}>
                    <IconPlay />
                  </div>
                  {video.file_size && (
                    <span style={{
                      position: 'absolute', bottom: '8px', right: '8px',
                      fontSize: '10px', fontWeight: 600, color: '#fff',
                      background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px',
                    }}>
                      {formatFileSize(video.file_size)}
                    </span>
                  )}
                </div>
                {/* Video info */}
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{video.title}</div>
                  {video.description && (
                    <p style={{ fontSize: '12px', color: 'var(--c-text-dim)', lineHeight: 1.4, marginBottom: '8px' }}>
                      {video.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--c-text-dim)' }}>
                      {video.uploaded_by && `By ${video.uploaded_by}`}
                    </span>
                    {isAdmin && (
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video) }} style={{
                        background: 'none', border: 'none', color: 'var(--c-red)',
                        cursor: 'pointer', padding: '4px', opacity: 0.7,
                      }} title="Delete video">
                        <IconTrash />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%',
        transform: `translateX(-50%) translateY(${toast.visible ? 0 : 20}px)`,
        background: toast.type === 'error' ? 'var(--c-red)' : '#1a1a1a',
        color: '#fff', padding: '10px 22px', borderRadius: '8px',
        fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
        opacity: toast.visible ? 1 : 0, transition: 'all 0.3s ease', zIndex: 999,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {toast.type === 'success' && <IconCheck />} {toast.message}
      </div>
    </div>
  )
}

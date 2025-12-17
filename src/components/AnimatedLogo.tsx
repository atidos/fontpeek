import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

export default function AnimatedLogo() {
    const eRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
    const pupilRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
    const eyeContainerRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
    const logoRef = useRef<HTMLDivElement>(null)
    const [pupilOffset, setPupilOffset] = useState(0)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (eyeContainerRefs[0].current) {
                const rect = eyeContainerRefs[0].current.getBoundingClientRect()
                const eyeCenter = rect.left + rect.width / 2
                const mouseX = e.clientX
                const offset = (mouseX - eyeCenter) / 1000
                // Clamp the offset to a reasonable range (-0.3 to 0.3)
                const clampedOffset = Math.max(-0.3, Math.min(0.3, offset))
                setPupilOffset(clampedOffset)
            }
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    useEffect(() => {
        const cleanupFns: (() => void)[] = []

        eRefs.forEach((eRef, index) => {
            const eyeContainer = eyeContainerRefs[index].current
            const pupilRef = pupilRefs[index].current

            if (!eyeContainer || !eRef.current || !pupilRef) return

            const handleMouseEnter = () => {
                const tl = gsap.timeline()
                tl.to(pupilRef, {
                    y: '150%',
                    duration: 0.5,
                    ease: 'power3.inOut',
                    overwrite: true
                })
                tl.to(eRef.current, {
                    y: '-0.655em',
                    duration: 0.5,
                    ease: 'power3.inOut',
                    overwrite: true
                }, "-=0.2")
            }

            const handleMouseLeave = () => {
                const tl = gsap.timeline()
                tl.to(eRef.current, {
                    y: '-0.865em',
                    duration: 0.5,
                    ease: 'power3.inOut',
                    overwrite: true
                })
                tl.to(pupilRef, {
                    y: '50%',
                    duration: 0.5,
                    ease: 'power3.inOut',
                    overwrite: true
                })
                tl.set(eRef.current, { y: '-0.335em' })
            }

            eyeContainer.addEventListener('mouseenter', handleMouseEnter)
            eyeContainer.addEventListener('mouseleave', handleMouseLeave)

            cleanupFns.push(() => {
                eyeContainer.removeEventListener('mouseenter', handleMouseEnter)
                eyeContainer.removeEventListener('mouseleave', handleMouseLeave)
            })
        })

        return () => {
            cleanupFns.forEach(fn => fn())
        }
    }, [])

    useEffect(() => {
        const timelines: gsap.core.Timeline[] = []

        // Synchronized animations for both e's and pupils
        eRefs.forEach((eRef, index) => {
            if (eRef.current && pupilRefs[index].current) {
                const tl = gsap.timeline()
                timelines.push(tl)

                // Set initial states
                tl.set(eRef.current, { y: '-0.655em' })
                tl.set(pupilRefs[index].current, { y: '150%' }, 0)

                // Animate both together
                tl.to(eRef.current, {
                    y: '-0.335em',
                    duration: 2,
                    ease: 'power3.inOut'
                }, 1)
                tl.to(pupilRefs[index].current, {
                    y: '50%',
                    duration: 2,
                    ease: 'power3.inOut'
                }, "-=1")
            }
        })

        return () => {
            timelines.forEach(tl => tl.kill())
        }
    }, [])

    return (
        <div ref={logoRef} style={{
            fontFamily: '"Gloock", serif',
            fontSize: '6rem',
            fontWeight: 400,
            display: 'inline-flex',
            alignItems: 'center',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility'
        }} className='drop-shadow-sm' >
            <span>f</span>
            <span>o</span>
            <span>n</span>
            <span>t</span>
            <span>p</span>
            <div ref={eyeContainerRefs[0]} style={{
                display: 'inline-block',
                height: '0.53em',
                overflow: 'hidden',
                position: 'relative',
                lineHeight: 1,
                verticalAlign: 'baseline'
            }} className='-mb-5'>
                <div ref={eRefs[0]} style={{
                    lineHeight: 0.538,
                    position: 'relative',
                    top: 0,
                    left: 0,
                    transform: 'translateZ(0)',
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden'
                }}>
                    <div style={{ lineHeight: 0.538, margin: 0, padding: 0, display: 'block' }}>e</div>
                    <div style={{ lineHeight: 0.538, margin: 0, padding: 0, display: 'block' }}>e</div>
                    <div style={{ lineHeight: 0.538, margin: 0, padding: 0, display: 'block' }}>e</div>
                </div>
                <div id="pupil-left" ref={pupilRefs[0]} className='absolute left-1/2 bottom-0 size-5'>
                    <div className='relative w-full h-full rounded-full bg-black' style={{
                        transform: `translateX(calc(-50% + ${pupilOffset * 1.5}rem))`,
                    }} />
                </div>
            </div>
            <div ref={eyeContainerRefs[1]} style={{
                display: 'inline-block',
                height: '0.53em',
                overflow: 'hidden',
                position: 'relative',
                lineHeight: 1,
                verticalAlign: 'baseline'
            }} className='-mb-5'>
                <div ref={eRefs[1]} style={{
                    lineHeight: 0.538,
                    position: 'relative',
                    top: 0,
                    left: 0,
                    transform: 'translateZ(0)',
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                }}>
                    <div style={{ lineHeight: 0.538, margin: 0, padding: 0, display: 'block' }}>e</div>
                    <div style={{ lineHeight: 0.538, margin: 0, padding: 0, display: 'block' }}>e</div>
                    <div style={{ lineHeight: 0.538, margin: 0, padding: 0, display: 'block' }}>e</div>
                </div>
                <div id="pupil-right" ref={pupilRefs[1]} className='absolute left-1/2 bottom-0 size-5'>
                    <div className='relative w-full h-full rounded-full bg-black' style={{
                        transform: `translateX(calc(-50% + ${pupilOffset * 1.5}rem))`,
                    }} />
                </div>
            </div>
            <span>k</span>
        </div>
    )
}

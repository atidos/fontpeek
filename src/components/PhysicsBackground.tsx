import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import opentype from 'opentype.js'

interface PhysicsBackgroundProps {
    text: string
}

export default function PhysicsBackground({ text }: PhysicsBackgroundProps) {
    const sceneRef = useRef<HTMLDivElement>(null)
    const engineRef = useRef<Matter.Engine | null>(null)
    const renderRef = useRef<Matter.Render | null>(null)
    const bodiesRef = useRef<Map<string, Matter.Body>>(new Map())
    const prevTextRef = useRef('')
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const fontRef = useRef<opentype.Font | null>(null)

    useEffect(() => {
        if (!sceneRef.current) return

        // Create engine
        const engine = Matter.Engine.create()
        engineRef.current = engine

        // Create renderer
        const render = Matter.Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false,
                background: 'transparent',
                wireframeBackground: 'transparent'
            }
        })
        renderRef.current = render

        // Add boundaries (walls outside viewport)
        const ground = Matter.Bodies.rectangle(
            window.innerWidth / 2,
            window.innerHeight + 25,
            window.innerWidth,
            50,
            { isStatic: true }
        )
        const wallLeft = Matter.Bodies.rectangle(
            -25,
            window.innerHeight / 2,
            50,
            window.innerHeight,
            { isStatic: true }
        )
        const wallRight = Matter.Bodies.rectangle(
            window.innerWidth + 25,
            window.innerHeight / 2,
            50,
            window.innerHeight,
            { isStatic: true }
        )

        Matter.Composite.add(engine.world, [ground, wallLeft, wallRight])

        // Load custom font with opentype.js
        opentype.load('/OPTIVenus-BoldExtended.otf', (err, font) => {
            if (err || !font) {
                console.error('Font load failed:', err)
                return
            }
            fontRef.current = font
            console.log('Font loaded successfully')
        })

        // Store canvas ref
        canvasRef.current = render.canvas

        // Run engine and renderer
        const runner = Matter.Runner.create()
        Matter.Runner.run(runner, engine)
        Matter.Render.run(render)

        // Custom render to draw smooth letter sprites
        Matter.Events.on(render, 'afterRender', () => {
            const ctx = render.canvas.getContext('2d')
            if (!ctx || !fontRef.current) return

            // Clear the entire canvas first to remove any Matter.js default rendering
            ctx.clearRect(0, 0, render.canvas.width, render.canvas.height)

            bodiesRef.current.forEach((body) => {
                ctx.save()
                ctx.translate(body.position.x, body.position.y)
                ctx.rotate(body.angle)

                // Draw letter using font path with stored fontSize
                const fontSize = (body as any).plugin?.fontSize || 80
                const path = fontRef.current!.getPath(body.label || '', 0, 0, fontSize)

                // Center the glyph
                const bounds = path.getBoundingBox()
                const offsetX = -(bounds.x1 + bounds.x2) / 2
                const offsetY = (bounds.y1 + bounds.y2) / 2

                ctx.translate(offsetX, offsetY)
                ctx.scale(1, -1) // Flip Y axis for font coordinates

                // Manually build path from commands
                ctx.fillStyle = '#ff3d00'
                ctx.beginPath()

                for (const cmd of path.commands) {
                    if (cmd.type === 'M') {
                        ctx.moveTo(cmd.x!, cmd.y!)
                    } else if (cmd.type === 'L') {
                        ctx.lineTo(cmd.x!, cmd.y!)
                    } else if (cmd.type === 'Q') {
                        ctx.quadraticCurveTo(cmd.x1!, cmd.y1!, cmd.x!, cmd.y!)
                    } else if (cmd.type === 'C') {
                        ctx.bezierCurveTo(cmd.x1!, cmd.y1!, cmd.x2!, cmd.y2!, cmd.x!, cmd.y!)
                    } else if (cmd.type === 'Z') {
                        ctx.closePath()
                    }
                }

                ctx.fill()

                ctx.restore()
            })
        })

        return () => {
            Matter.Render.stop(render)
            Matter.Runner.stop(runner)
            Matter.Engine.clear(engine)
            if (render.canvas) {
                render.canvas.remove()
            }
            render.textures = {}
        }
    }, [])

    useEffect(() => {
        if (!engineRef.current || !fontRef.current) return

        const prevText = prevTextRef.current
        const newText = text
        const MAX_LETTERS = 50

        // Find added letters
        if (newText.length > prevText.length) {
            const added = newText.slice(prevText.length)

            added.split('').forEach((char, i) => {
                if (char.trim() === '') return

                // Remove oldest letters if we exceed MAX_LETTERS
                while (bodiesRef.current.size >= MAX_LETTERS) {
                    const firstEntry = bodiesRef.current.entries().next().value
                    if (firstEntry) {
                        const [id, body] = firstEntry
                        Matter.Composite.remove(engineRef.current!.world, body)
                        bodiesRef.current.delete(id)
                    }
                }

                const id = `${Date.now()}-${i}`
                const x = Math.random() * window.innerWidth
                const y = -100

                const fontSize = 100 + Math.random() * 300
                if (!fontRef.current) return

                const path = fontRef.current.getPath(char, 0, 0, fontSize)

                // Convert path to vertices with proper curve sampling
                // Handle multiple contours (separate closed paths)
                const contours: Matter.Vector[][] = []
                let currentContour: Matter.Vector[] = []
                const commands = path.commands
                let currentX = 0, currentY = 0

                for (let j = 0; j < commands.length; j++) {
                    const cmd = commands[j]

                    if (cmd.type === 'M') {
                        // Start of a new contour
                        if (currentContour.length > 0) {
                            contours.push(currentContour)
                            currentContour = []
                        }
                        currentX = cmd.x!
                        currentY = cmd.y!
                        currentContour.push({ x: currentX, y: -currentY })
                    } else if (cmd.type === 'L') {
                        currentX = cmd.x!
                        currentY = cmd.y!
                        currentContour.push({ x: currentX, y: -currentY })
                    } else if (cmd.type === 'Q') {
                        const x1 = cmd.x1!, y1 = cmd.y1!
                        const x2 = cmd.x!, y2 = cmd.y!
                        const samples = 8
                        for (let t = 1; t <= samples; t++) {
                            const ratio = t / samples
                            const x = (1 - ratio) * (1 - ratio) * currentX + 2 * (1 - ratio) * ratio * x1 + ratio * ratio * x2
                            const y = (1 - ratio) * (1 - ratio) * currentY + 2 * (1 - ratio) * ratio * y1 + ratio * ratio * y2
                            currentContour.push({ x, y: -y })
                        }
                        currentX = x2
                        currentY = y2
                    } else if (cmd.type === 'C') {
                        const x1 = cmd.x1!, y1 = cmd.y1!
                        const x2 = cmd.x2!, y2 = cmd.y2!
                        const x3 = cmd.x!, y3 = cmd.y!
                        const samples = 10
                        for (let t = 1; t <= samples; t++) {
                            const ratio = t / samples
                            const r1 = (1 - ratio) * (1 - ratio) * (1 - ratio)
                            const r2 = 3 * (1 - ratio) * (1 - ratio) * ratio
                            const r3 = 3 * (1 - ratio) * ratio * ratio
                            const r4 = ratio * ratio * ratio
                            const x = r1 * currentX + r2 * x1 + r3 * x2 + r4 * x3
                            const y = r1 * currentY + r2 * y1 + r3 * y2 + r4 * y3
                            currentContour.push({ x, y: -y })
                        }
                        currentX = x3
                        currentY = y3
                    } else if (cmd.type === 'Z') {
                        // Close path - optional, usually handled by next M
                    }
                }

                // Add the last contour
                if (currentContour.length > 0) {
                    contours.push(currentContour)
                }

                if (contours.length === 0 || contours[0].length < 3) {
                    console.warn('No valid contours for', char)
                    return
                }

                // Remove consecutive duplicate vertices
                contours.forEach((contour, idx) => {
                    const cleaned: Matter.Vector[] = []
                    for (let i = 0; i < contour.length; i++) {
                        const curr = contour[i]
                        const next = contour[(i + 1) % contour.length]
                        // Only add if not duplicate of next vertex
                        const dist = Math.hypot(next.x - curr.x, next.y - curr.y)
                        if (dist > 0.1) { // threshold for considering vertices different
                            cleaned.push(curr)
                        }
                    }
                    contours[idx] = cleaned
                })

                // Filter out contours that became too small
                const validContours = contours.filter(c => c.length >= 3)
                if (validContours.length === 0) {
                    console.warn('No valid contours after deduplication for', char)
                    return
                }

                console.log(`Raw contours for "${char}":`, validContours)

                // Matter.js requires vertices in clockwise order
                // Ensure proper winding by checking and reversing if needed
                validContours.forEach(contour => {
                    // Calculate signed area to determine winding
                    let area = 0
                    for (let i = 0; i < contour.length; i++) {
                        const j = (i + 1) % contour.length
                        area += (contour[j].x - contour[i].x) * (contour[j].y + contour[i].y)
                    }
                    // If area is positive, vertices are counter-clockwise, so reverse
                    if (area > 0) {
                        contour.reverse()
                    }
                })

                console.log(`Creating body for "${char}" with ${validContours.length} contours:`, validContours.map(c => c.length))

                // Create body from vertices (pass all contours)
                const letter = Matter.Bodies.fromVertices(x, y, validContours, {
                    restitution: 0.6,
                    friction: 0.1,
                    render: {
                        visible: false
                    },
                    label: char,
                    plugin: {
                        fontSize: fontSize
                    }
                }, true) // flagInternal = true to handle complex shapes

                if (!letter) {
                    console.warn('Failed to create body for', char, 'with', contours.length, 'contours')
                    return
                }

                console.log(`Body created for "${char}":`, {
                    area: letter.area,
                    vertices: letter.vertices.length,
                    parts: letter.parts.length,
                    mass: letter.mass,
                    density: letter.density
                })

                // Ensure minimum density for collision detection
                Matter.Body.setDensity(letter, Math.max(letter.density, 0.001))
                Matter.Body.setMass(letter, Math.max(letter.mass, 1))

                // Set random initial rotation
                Matter.Body.setAngle(letter, Math.random() * Math.PI * 2)

                Matter.Body.setVelocity(letter, {
                    x: (Math.random() - 0.5) * 10,
                    y: 0
                })

                Matter.Composite.add(engineRef.current!.world, letter)
                bodiesRef.current.set(id, letter)
            })
        }
        // Backspace
        else if (newText.length < prevText.length) {
            const toRemove = prevText.length - newText.length
            const bodies = Array.from(bodiesRef.current.entries()).slice(-toRemove)

            bodies.forEach(([id, body]) => {
                Matter.Composite.remove(engineRef.current!.world, body)
                bodiesRef.current.delete(id)
            })
        }

        prevTextRef.current = newText
    }, [text])

    return (
        <div
            ref={sceneRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 1,
                pointerEvents: 'none',
            }}
        />
    )
}

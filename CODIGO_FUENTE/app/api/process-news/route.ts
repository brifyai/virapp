
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { content, step, radioStyle, provider = 'abacus', model = 'gpt-4.1-mini', groqApiKey } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (provider === 'groq' && !groqApiKey) {
      return NextResponse.json({ error: 'Groq API Key is required' }, { status: 400 })
    }

    // Configurar el prompt según el paso
    let systemPrompt = ''
    let userPrompt = ''

    switch (step) {
      case 'rewrite':
        systemPrompt = 'Eres un periodista experto en reescribir noticias para radio en Chile. Mantén los hechos exactos pero adapta el lenguaje para ser claro, directo y apropiado para audiencia radial.'
        userPrompt = `Reescribe la siguiente noticia para radio manteniendo todos los hechos importantes pero adaptando el lenguaje para ser más dinámico y apropiado para transmisión radial:\n\n${content}`
        break
      case 'humanize':
        systemPrompt = 'Eres un locutor de radio profesional chileno. Tu trabajo es humanizar noticias para que suenen naturales y conversacionales.'
        userPrompt = `Humaniza esta noticia para que suene como si un locutor de radio chileno la estuviera contando de manera natural y conversacional:\n\n${content}`
        break
      case 'adapt':
        systemPrompt = 'Adapta el tono y estilo de las noticias según la identidad de la radio.'
        userPrompt = `Adapta esta noticia al estilo ${radioStyle || 'profesional y objetivo'}. Mantén los hechos pero ajusta el tono y enfoque:\n\n${content}`
        break
      default:
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }

    // Configurar la API según el proveedor
    let apiUrl = ''
    let headers = {}
    
    if (provider === 'abacus') {
      apiUrl = 'https://apps.abacus.ai/v1/chat/completions'
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      }
    } else if (provider === 'groq') {
      apiUrl = 'https://api.groq.com/openai/v1/chat/completions'
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      }
    }

    // Llamar a la API seleccionada
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const processedContent = data.choices[0]?.message?.content

    if (!processedContent) {
      throw new Error('No content generated')
    }

    return NextResponse.json({
      success: true,
      originalContent: content,
      processedContent: processedContent.trim(),
      step,
      radioStyle,
      provider,
      model
    })

  } catch (error) {
    console.error('Error processing news:', error)
    return NextResponse.json(
      { error: 'Error processing news with AI' },
      { status: 500 }
    )
  }
}

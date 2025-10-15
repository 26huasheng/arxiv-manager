import fs from 'fs/promises'
import path from 'path'
import { Paper } from '../src/types/paper'

const mockPapers: Paper[] = [
  {
    id: 'arxiv-2401-12345',
    title: 'Attention Is All You Need: A Comprehensive Survey',
    authors: ['Alice Smith', 'Bob Johnson', 'Carol Williams'],
    categories: ['cs.LG', 'cs.CL', 'cs.AI'],
    abstract: 'We present a comprehensive survey of attention mechanisms in deep learning. The Transformer architecture has revolutionized natural language processing and is now being applied across various domains. This paper examines the evolution of attention mechanisms, their mathematical foundations, and their impact on modern AI systems. We analyze over 300 papers and identify key trends and future directions.',
    pdfUrl: 'https://arxiv.org/pdf/2401.12345',
    sourceUrl: 'https://arxiv.org/abs/2401.12345',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'arxiv-2401-23456',
    title: 'Efficient Training of Large Language Models with Mixed Precision',
    authors: ['David Chen', 'Emma Davis'],
    categories: ['cs.LG', 'cs.AI'],
    abstract: 'Training large language models requires significant computational resources. We propose a novel mixed precision training strategy that reduces memory usage by 40% while maintaining model quality. Our approach combines dynamic loss scaling with gradient checkpointing and shows promising results on models up to 175B parameters.',
    pdfUrl: 'https://arxiv.org/pdf/2401.23456',
    sourceUrl: 'https://arxiv.org/abs/2401.23456',
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'arxiv-2401-34567',
    title: 'Reinforcement Learning for Robotics: Recent Advances and Challenges',
    authors: ['Frank Miller', 'Grace Lee', 'Henry Zhang'],
    categories: ['cs.RO', 'cs.LG'],
    abstract: 'This paper reviews recent advances in applying reinforcement learning to robotics problems. We discuss sample efficiency, sim-to-real transfer, and safety considerations. Our experimental results demonstrate that modern RL algorithms can achieve human-level performance on complex manipulation tasks with proper reward shaping.',
    pdfUrl: 'https://arxiv.org/pdf/2401.34567',
    sourceUrl: 'https://arxiv.org/abs/2401.34567',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'arxiv-2401-45678',
    title: 'Diffusion Models for Image Generation: A Practical Guide',
    authors: ['Ivy Anderson', 'Jack Wilson'],
    categories: ['cs.CV', 'cs.LG'],
    abstract: 'Diffusion models have emerged as a powerful approach for generating high-quality images. This practical guide covers the fundamentals of diffusion processes, noise scheduling strategies, and guidance techniques. We provide code examples and training recipes for practitioners looking to implement these models.',
    pdfUrl: 'https://arxiv.org/pdf/2401.45678',
    sourceUrl: 'https://arxiv.org/abs/2401.45678',
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'arxiv-2401-56789',
    title: 'Graph Neural Networks for Molecular Property Prediction',
    authors: ['Kate Brown', 'Liam Taylor'],
    categories: ['cs.LG', 'q-bio.BM'],
    abstract: 'Predicting molecular properties is crucial for drug discovery. We introduce a graph neural network architecture specifically designed for molecular graphs. Our model achieves state-of-the-art results on benchmark datasets including QM9 and ZINC, outperforming previous methods by 15% on average.',
    pdfUrl: 'https://arxiv.org/pdf/2401.56789',
    sourceUrl: 'https://arxiv.org/abs/2401.56789',
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'arxiv-2401-67890',
    title: 'Federated Learning: Privacy-Preserving Machine Learning at Scale',
    authors: ['Michael White', 'Nancy Green', 'Oscar Martinez'],
    categories: ['cs.LG', 'cs.CR'],
    abstract: 'Federated learning enables training machine learning models across decentralized devices while preserving privacy. This paper surveys recent developments in federated optimization, secure aggregation, and differential privacy. We present empirical results showing that federated models can match centralized performance while maintaining strong privacy guarantees.',
    pdfUrl: 'https://arxiv.org/pdf/2401.67890',
    sourceUrl: 'https://arxiv.org/abs/2401.67890',
    publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'arxiv-2401-78901',
    title: 'Vision Transformers: From Image Classification to Dense Prediction',
    authors: ['Patricia Clark', 'Quinn Rodriguez'],
    categories: ['cs.CV', 'cs.LG'],
    abstract: 'Vision Transformers have demonstrated remarkable performance on image classification tasks. In this work, we extend ViT to dense prediction problems including object detection, semantic segmentation, and depth estimation. Our unified architecture achieves competitive results across all tasks with a single set of pretrained weights.',
    pdfUrl: 'https://arxiv.org/pdf/2401.78901',
    sourceUrl: 'https://arxiv.org/abs/2401.78901',
    publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'arxiv-2401-89012',
    title: 'Neural Architecture Search: A Comprehensive Survey',
    authors: ['Rachel Adams', 'Steve King'],
    categories: ['cs.LG', 'cs.NE'],
    abstract: 'Neural Architecture Search automates the design of neural networks. We survey over 200 NAS methods, categorizing them by search space, search strategy, and performance estimation approach. Our analysis reveals that recent gradient-based methods offer the best trade-off between search cost and model performance.',
    pdfUrl: 'https://arxiv.org/pdf/2401.89012',
    sourceUrl: 'https://arxiv.org/abs/2401.89012',
    publishedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'arxiv-2401-90123',
    title: 'Contrastive Learning for Self-Supervised Representation Learning',
    authors: ['Thomas Baker', 'Uma Patel'],
    categories: ['cs.LG', 'cs.CV'],
    abstract: 'Contrastive learning has become a dominant paradigm in self-supervised learning. We analyze the theoretical foundations of contrastive objectives and propose improvements that enhance representation quality. Experiments on ImageNet show that our method achieves 75% top-1 accuracy using only unlabeled data.',
    pdfUrl: 'https://arxiv.org/pdf/2401.90123',
    sourceUrl: 'https://arxiv.org/abs/2401.90123',
    publishedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'arxiv-2401-01234',
    title: 'Multimodal Learning: Bridging Vision and Language',
    authors: ['Victor Hill', 'Wendy Scott', 'Xavier Turner'],
    categories: ['cs.CV', 'cs.CL', 'cs.LG'],
    abstract: 'Multimodal models that can understand both images and text are essential for many applications. We present a comprehensive study of vision-language pretraining methods, including CLIP, ALIGN, and BLIP. Our analysis covers training strategies, architecture choices, and downstream task performance across 12 benchmarks.',
    pdfUrl: 'https://arxiv.org/pdf/2401.01234',
    sourceUrl: 'https://arxiv.org/abs/2401.01234',
    publishedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

async function seed() {
  const dataDir = path.join(process.cwd(), 'data')
  const papersPath = path.join(dataDir, 'papers.json')

  try {
    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true })

    // Write mock papers
    await fs.writeFile(papersPath, JSON.stringify(mockPapers, null, 2), 'utf-8')

    console.log(`✅ Successfully seeded ${mockPapers.length} papers to ${papersPath}`)
  } catch (error) {
    console.error('❌ Error seeding data:', error)
    process.exit(1)
  }
}

seed()

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Gerente de Produto",
    content: "O Fluxo Alfa revolucionou como nossa equipe colabora. As respostas de IA são incrivelmente úteis e precisas.",
    rating: 5
  },
  {
    name: "Michael Chen",
    role: "Desenvolvedor",
    content: "As capacidades de integração são fantásticas. Tornou-se uma ferramenta essencial em nosso fluxo de trabalho de desenvolvimento.",
    rating: 5
  },
  {
    name: "Emily Rodriguez",
    role: "Diretora de Marketing",
    content: "As mensagens ilimitadas no plano Pro foram um divisor de águas para nosso processo de criação de conteúdo.",
    rating: 5
  }
];

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">O que Nossos Usuários Dizem</h2>
          <p className="text-xl text-muted-foreground">
            Junte-se a milhares de usuários satisfeitos em todo o mundo
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
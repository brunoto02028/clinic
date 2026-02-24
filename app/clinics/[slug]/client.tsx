'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  Phone,
  Mail,
  Calendar,
  Users,
  Clock,
  ChevronRight,
  Footprints,
  Activity,
  Heart,
  Stethoscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ClinicData {
  id: string;
  name: string;
  slug: string;
  branding: {
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  contact: {
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postcode: string | null;
    country: string | null;
  };
  settings: {
    siteName: string | null;
    tagline: string | null;
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroImageUrl: string | null;
    aboutTitle: string | null;
    aboutText: string | null;
    aboutImageUrl: string | null;
    servicesJson: string | null;
  } | null;
  team: {
    id: string;
    name: string;
    role: string;
    imageUrl: string | null;
  }[];
  articles: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    imageUrl: string | null;
    publishedAt: string | null;
  }[];
}

interface ClinicPageClientProps {
  clinic: ClinicData;
}

export default function ClinicPageClient({ clinic }: ClinicPageClientProps) {
  // Parse services
  let services: any[] = [];
  try {
    services = clinic.settings?.servicesJson 
      ? JSON.parse(clinic.settings.servicesJson) 
      : [];
  } catch (e) {
    services = [];
  }
  
  // Default services if none configured
  if (services.length === 0) {
    services = [
      { name: 'Initial Assessment', price: '£75', duration: '60 min', description: 'Comprehensive evaluation and treatment plan' },
      { name: 'Follow-up Session', price: '£55', duration: '45 min', description: 'Continued treatment and progress review' },
      { name: 'Sports Massage', price: '£50', duration: '45 min', description: 'Deep tissue massage for recovery' },
      { name: 'Foot Scan & Analysis', price: '£85', duration: '45 min', description: '3D foot scanning with biomechanical analysis' }
    ];
  }
  
  // CSS variables for dynamic theming
  const themeStyles = {
    '--clinic-primary': clinic.branding.primaryColor,
    '--clinic-secondary': clinic.branding.secondaryColor,
  } as React.CSSProperties;
  
  return (
    <div style={themeStyles} className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {clinic.branding.logoUrl ? (
                <div className="relative h-10 w-10">
                  <Image
                    src={clinic.branding.logoUrl}
                    alt={clinic.name}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <Footprints className="h-8 w-8" style={{ color: clinic.branding.primaryColor }} />
              )}
              <span className="font-bold text-lg">{clinic.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href={`/clinics/${clinic.slug}/login`}>
                <Button variant="ghost" size="sm">Patient Login</Button>
              </Link>
              <Link href={`/clinics/${clinic.slug}/book`}>
                <Button 
                  size="sm"
                  style={{ backgroundColor: clinic.branding.secondaryColor }}
                  className="hover:opacity-90"
                >
                  Book Appointment
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {clinic.settings?.heroImageUrl && (
          <div className="absolute inset-0">
            <Image
              src={clinic.settings.heroImageUrl}
              alt="Hero background"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
          </div>
        )}
        <div 
          className={`absolute inset-0 ${!clinic.settings?.heroImageUrl ? 'bg-gradient-to-br' : ''}`}
          style={!clinic.settings?.heroImageUrl ? {
            background: `linear-gradient(135deg, ${clinic.branding.primaryColor} 0%, ${clinic.branding.secondaryColor} 100%)`
          } : undefined}
        />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {clinic.settings?.heroTitle || `Welcome to ${clinic.name}`}
            </h1>
            <p className="text-xl mb-8 text-gray-100">
              {clinic.settings?.heroSubtitle || 'Professional physiotherapy and sports rehabilitation services'}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={`/clinics/${clinic.slug}/book`}>
                <Button 
                  size="lg" 
                  className="text-white hover:opacity-90"
                  style={{ backgroundColor: clinic.branding.secondaryColor }}
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Book Appointment
                </Button>
              </Link>
              {clinic.contact.phone && (
                <a href={`tel:${clinic.contact.phone}`}>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
                    <Phone className="h-5 w-5 mr-2" />
                    {clinic.contact.phone}
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive physiotherapy and rehabilitation services tailored to your needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${clinic.branding.secondaryColor}20` }}
                    >
                      {index % 4 === 0 && <Stethoscope className="h-6 w-6" style={{ color: clinic.branding.secondaryColor }} />}
                      {index % 4 === 1 && <Activity className="h-6 w-6" style={{ color: clinic.branding.secondaryColor }} />}
                      {index % 4 === 2 && <Heart className="h-6 w-6" style={{ color: clinic.branding.secondaryColor }} />}
                      {index % 4 === 3 && <Footprints className="h-6 w-6" style={{ color: clinic.branding.secondaryColor }} />}
                    </div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4">{service.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold" style={{ color: clinic.branding.primaryColor }}>
                        {service.price}
                      </span>
                      {service.duration && (
                        <span className="text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.duration}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* About Section */}
      {clinic.settings?.aboutText && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">
                  {clinic.settings.aboutTitle || `About ${clinic.name}`}
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 leading-relaxed">
                    {clinic.settings.aboutText}
                  </p>
                </div>
              </div>
              {clinic.settings.aboutImageUrl && (
                <div>
                  <Image
                    src={clinic.settings.aboutImageUrl}
                    alt="About us"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      
      {/* Team Section */}
      {clinic.team.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Meet Our Team</h2>
              <p className="text-gray-600">Experienced professionals dedicated to your recovery</p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {clinic.team.map((member, index) => (
                <div>
                  <div 
                    className="relative w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden"
                    style={{ backgroundColor: `${clinic.branding.secondaryColor}20` }}
                  >
                    {member.imageUrl ? (
                      <Image
                        src={member.imageUrl}
                        alt={member.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="h-12 w-12" style={{ color: clinic.branding.secondaryColor }} />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold">{member.name}</h3>
                  <Badge variant="secondary" className="mt-1">
                    {member.role === 'THERAPIST' ? 'Physiotherapist' : 'Clinic Director'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Articles Section */}
      {clinic.articles.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Latest Articles</h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clinic.articles.slice(0, 3).map((article, index) => (
                <div>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    {article.imageUrl && (
                      <div className="relative h-48">
                        <Image
                          src={article.imageUrl}
                          alt={article.title}
                          fill
                          className="object-cover rounded-t-lg"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2">{article.title}</h3>
                      {article.excerpt && (
                        <p className="text-gray-600 text-sm line-clamp-3">{article.excerpt}</p>
                      )}
                      {article.publishedAt && (
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(article.publishedAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Contact Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>
              
              <div className="space-y-4">
                {clinic.contact.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-1" style={{ color: clinic.branding.secondaryColor }} />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-gray-600">
                        {clinic.contact.address}
                        {clinic.contact.city && `, ${clinic.contact.city}`}
                        {clinic.contact.postcode && ` ${clinic.contact.postcode}`}
                      </p>
                    </div>
                  </div>
                )}
                
                {clinic.contact.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 mt-1" style={{ color: clinic.branding.secondaryColor }} />
                    <div>
                      <p className="font-medium">Phone</p>
                      <a href={`tel:${clinic.contact.phone}`} className="text-gray-600 hover:underline">
                        {clinic.contact.phone}
                      </a>
                    </div>
                  </div>
                )}
                
                {clinic.contact.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 mt-1" style={{ color: clinic.branding.secondaryColor }} />
                    <div>
                      <p className="font-medium">Email</p>
                      <a href={`mailto:${clinic.contact.email}`} className="text-gray-600 hover:underline">
                        {clinic.contact.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* CTA */}
            <div 
              className="rounded-xl p-8 text-white"
              style={{ backgroundColor: clinic.branding.primaryColor }}
            >
              <h3 className="text-2xl font-bold mb-4">Ready to Start Your Recovery?</h3>
              <p className="mb-6 text-gray-100">
                Book your initial assessment today and take the first step towards better health and mobility.
              </p>
              <Link href={`/clinics/${clinic.slug}/book`}>
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-gray-900"
                  style={{ backgroundColor: clinic.branding.secondaryColor }}
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Book Your Appointment
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer 
        className="py-8 text-white"
        style={{ backgroundColor: clinic.branding.primaryColor }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {clinic.branding.logoUrl ? (
                <div className="relative h-8 w-8">
                  <Image
                    src={clinic.branding.logoUrl}
                    alt={clinic.name}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <Footprints className="h-6 w-6" />
              )}
              <span className="font-semibold">{clinic.name}</span>
            </div>
            <p className="text-sm text-gray-200">
              © {new Date().getFullYear()} {clinic.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

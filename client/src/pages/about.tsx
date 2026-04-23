import { Card, CardContent } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Link } from"wouter";
import { motion } from"framer-motion";
import { Shield, GraduationCap, Users, Lightbulb, Heart, Target, ArrowRight } from"lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const values = [
  {
    icon: Shield,
    title:"Safety",
    description:"Every interaction is monitored with strict safeguarding protocols. We ensure a secure learning environment where children can thrive without risk.",
  },
  {
    icon: GraduationCap,
    title:"Education",
    description:"Quality education should be accessible to everyone. We provide free, structured learning pathways designed specifically for orphanage children.",
  },
  {
    icon: Users,
    title:"Community",
    description:"We foster a supportive community where tutors, students, and coordinators collaborate to create meaningful educational experiences.",
  },
  {
    icon: Lightbulb,
    title:"Innovation",
    description:"Built for low-bandwidth environments with adaptive technology, ensuring no child is left behind regardless of their technical resources.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen">
      <section className="relative py-16 md:py-24 overflow-visible">
        <div className="absolute inset-0 bg-primary opacity-5" />
        <div className="max-w-4xl mx-auto px-4 relative">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-center space-y-6"
          >
            <motion.div variants={fadeUp}>
              <Badge variant="secondary" className="no-default-active-elevate mb-4">
                <Heart className="w-3 h-3" /> Our Story
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-3xl md:text-5xl font-bold font-display"
              data-testid="text-about-title"
            >
              About{""}
              <span className="text-primary">TutorBridge</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg leading-relaxed"
              data-testid="text-about-mission"
            >
              TutorBridge is a peer-to-peer tutoring platform built with one purpose: to connect
              orphanage children with dedicated volunteer tutors, creating a safe and empowering
              space for learning, growth, and opportunity.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="space-y-8"
          >
            <motion.div variants={fadeUp} className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold font-display" data-testid="text-mission-heading">
                Our Mission
              </h2>
              <p className="text-sm text-muted-foreground">What drives everything we do</p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="border border-slate-200 dark:border-slate-800 rounded-md">
                <Card className="border-0">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold font-display text-lg">Bridging the Education Gap</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed" data-testid="text-mission-body">
                      Millions of orphanage children around the world lack access to quality education
                      and mentorship. TutorBridge was created to change that reality. We connect caring
                      volunteer tutors with children who deserve every opportunity to learn, grow, and
                      build a brighter future. Our platform is designed to be accessible, safe, and
                      effective -- even in low-bandwidth environments -- so that geography and resources
                      never stand in the way of a child's potential.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="space-y-8"
          >
            <motion.div variants={fadeUp} className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold font-display" data-testid="text-values-heading">
                Our Values
              </h2>
              <p className="text-sm text-muted-foreground">The principles that guide our platform</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {values.map((v, i) => (
                <motion.div key={v.title} variants={fadeUp}>
                  <Card className="h-full" data-testid={`card-value-${i}`}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                        <v.icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold font-display">{v.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="space-y-8"
          >
            <motion.div variants={fadeUp} className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold font-display" data-testid="text-origin-heading">
                How We Started
              </h2>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-origin-body">
                    TutorBridge began as a simple idea: what if technology could remove the barriers
                    between willing tutors and children who need them most? Founded by a group of
                    educators and technologists who witnessed firsthand the educational challenges
                    faced by orphanage children, we set out to build a platform that prioritizes
                    safety, accessibility, and impact. From our first pilot program connecting five
                    tutors with a single orphanage, we have grown into a platform serving communities
                    across multiple regions. Every feature we build is guided by feedback from the
                    tutors, students, and coordinators who use TutorBridge every day.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <div className="border border-slate-200 dark:border-slate-800 rounded-md">
              <Card className="border-0">
                <CardContent className="py-12 text-center space-y-6">
                  <div className="w-14 h-14 rounded-md bg-primary flex items-center justify-center mx-auto">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold font-display" data-testid="text-cta-heading">
                    Join Us
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                    Whether you want to teach, learn, or coordinate, there is a place for you
                    on TutorBridge. Join our growing community and help shape the future of
                    education for children who need it most.
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Link href="/signup">
                      <Button className="bg-primary border-0 text-white" data-testid="button-about-signup">
                        Get Started <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href="/classes">
                      <Button variant="outline" data-testid="button-about-browse">
                        Browse Classes
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

import React, { useState } from 'react';
import { User, CreditPackage, SystemSettings, SubscriptionPlan } from '../types';
import { ShoppingBag, Crown, Zap, Lock, Calendar, Sparkles, ArrowRight, CheckCircle, Video, BookOpen, Star } from 'lucide-react';

interface Props {
  user: User;
  settings?: SystemSettings;
  onUserUpdate: (user: User) => void;
}

const DEFAULT_PACKAGES: CreditPackage[] = [
  { id: 'pkg-1', name: '100 Credits', credits: 100, price: 10 },
  { id: 'pkg-2', name: '200 Credits', credits: 200, price: 20 },
  { id: 'pkg-3', name: '500 Credits', credits: 500, price: 50 },
  { id: 'pkg-4', name: '1000 Credits', credits: 1000, price: 100 },
  { id: 'pkg-5', name: '2000 Credits', credits: 2000, price: 200 },
  { id: 'pkg-6', name: '5000 Credits', credits: 5000, price: 500 },
  { id: 'pkg-7', name: '10000 Credits', credits: 10000, price: 1000 }
];

export const Store: React.FC<Props> = ({ user, settings, onUserUpdate }) => {
  const [activeSection, setActiveSection] = useState<'SUBSCRIPTIONS' | 'CREDITS'>('SUBSCRIPTIONS');
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('');
  const [tierType, setTierType] = useState<'BASIC' | 'ULTRA'>('BASIC');
  
  const packages = settings?.packages || DEFAULT_PACKAGES;
  const subscriptionPlans = settings?.subscriptionPlans || [];
  const adminPhones = settings?.adminPhones || [{id: 'default', number: '8227070298', name: 'Admin'}];
  
  const defaultPhoneId = adminPhones.find(p => p.isDefault)?.id || adminPhones[0]?.id || 'default';
  
  if (!selectedPhoneId && adminPhones.length > 0) {
    setSelectedPhoneId(defaultPhoneId);
  }

  const getPhoneNumber = (phoneId: string = selectedPhoneId) => {
    const phone = adminPhones.find(p => p.id === phoneId);
    return phone ? phone.number : '8227070298';
  };

  const handleBuySubscription = (plan: SubscriptionPlan) => {
    const phoneNum = getPhoneNumber();
    const price = tierType === 'BASIC' ? plan.basicPrice : plan.ultraPrice;
    const features = tierType === 'BASIC' ? 'MCQ + Notes' : 'PDF + Videos';
    
    const message = `Hello Admin, I want to buy Premium subscription.\n\n🆔 User ID: ${user.id}\n📦 Plan: ${plan.name} (${tierType})\n💰 Amount: ₹${price}\n✨ Features: ${features}\n\nPlease check my payment.`;
    const url = `https://wa.me/91${phoneNum}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleBuyCredits = (pkg: CreditPackage) => {
    const phoneNum = getPhoneNumber();
    const message = `Hello Admin, I want to buy credits.\n\n🆔 User ID: ${user.id}\n📦 Package: ${pkg.name}\n💰 Amount: ₹${pkg.price}\n💎 Credits: ${pkg.credits}\n\nPlease check my payment.`;
    const url = `https://wa.me/91${phoneNum}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (settings?.isPaymentEnabled === false) {
    return (
      <div className="animate-in fade-in zoom-in duration-300 pb-10">
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 p-10 rounded-3xl border-2 border-slate-300 text-center shadow-inner">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Lock size={40} className="text-slate-400" />
          </div>
          <h3 className="text-2xl font-black text-slate-700 mb-2">Store Locked</h3>
          <p className="text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
            {settings.paymentDisabledMessage || "Purchases are currently disabled by the Admin. Please check back later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      {/* Phone Selector */}
      {adminPhones.length > 1 && (
        <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-200">
          <label className="text-xs font-bold text-blue-700 block mb-2">Select Admin WhatsApp Number:</label>
          <select value={selectedPhoneId} onChange={e => setSelectedPhoneId(e.target.value)} className="w-full p-2 border border-blue-300 rounded-lg text-sm">
            {adminPhones.map(phone => (
              <option key={phone.id} value={phone.id}>{phone.name} - {phone.number}</option>
            ))}
          </select>
        </div>
      )}

      {/* Section Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveSection('SUBSCRIPTIONS')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            activeSection === 'SUBSCRIPTIONS'
              ? 'bg-[var(--primary)] text-white shadow-lg'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Crown size={18} /> Plans
        </button>
        <button
          onClick={() => setActiveSection('CREDITS')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            activeSection === 'CREDITS'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Zap size={18} /> Buy Credits
        </button>
      </div>

      {/* SUBSCRIPTIONS SECTION */}
      {activeSection === 'SUBSCRIPTIONS' && (
        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Choose Your Power</h2>
            <div className="flex justify-center gap-4 mt-4 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto">
                <button 
                    onClick={() => setTierType('BASIC')}
                    className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${tierType === 'BASIC' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <BookOpen size={16} /> Basic (MCQ+Notes)
                </button>
                <button 
                    onClick={() => setTierType('ULTRA')}
                    className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${tierType === 'ULTRA' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Video size={16} /> Ultra (PDF+Video)
                </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptionPlans.map((plan, idx) => {
              const price = tierType === 'BASIC' ? plan.basicPrice : plan.ultraPrice;
              const originalPrice = tierType === 'BASIC' ? plan.basicOriginalPrice : plan.ultraOriginalPrice;
              const features = tierType === 'BASIC' ? ['All MCQs Unlocked', 'Premium Notes'] : ['All MCQs Unlocked', 'Premium Notes', 'Video Lectures', 'PDF Downloads'];
              // Merge with plan specific features if any
              const displayFeatures = [...features, ...plan.features];

              return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-6 border-2 transition-all ${
                      plan.popular && tierType === 'ULTRA'
                        ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-white shadow-xl scale-105 z-10'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
                    }`}
                  >
                    {plan.popular && (
                      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg ${tierType === 'ULTRA' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-white'}`}>
                        Most Popular
                      </div>
                    )}

                    <div className="mb-4">
                      <h3 className="text-xl font-black text-slate-800">{plan.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{plan.duration} Access</p>
                    </div>

                    <div className="mb-4 flex items-end gap-1">
                      <span className={`text-4xl font-black ${tierType === 'ULTRA' ? 'text-purple-600' : 'text-slate-700'}`}>₹{price}</span>
                      <div className="mb-2">
                          {originalPrice && <span className="text-xs text-slate-400 line-through block">₹{originalPrice}</span>}
                          <span className="text-xs font-bold text-slate-400">/ {plan.name}</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl">
                      {displayFeatures.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <CheckCircle size={16} className={tierType === 'ULTRA' ? "text-purple-500" : "text-green-500"} />
                          {feature}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleBuySubscription(plan)}
                      className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        tierType === 'ULTRA'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:-translate-y-1'
                          : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}
                    >
                      {tierType === 'ULTRA' ? <Sparkles size={18} /> : <ShoppingBag size={18} />}
                      Get {plan.name} {tierType === 'ULTRA' ? 'Ultra' : 'Basic'}
                    </button>
                  </div>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-800 text-center">
              After clicking a plan, you'll be redirected to WhatsApp to complete payment with Admin.
            </p>
          </div>
        </div>
      )}

      {/* CREDITS SECTION */}
      {activeSection === 'CREDITS' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Buy Credits</h2>
            <p className="text-slate-500 text-sm">Use credits for premium content, analysis, and more.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {packages.map((pkg) => (
              <div key={pkg.id} className="relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <button
                  onClick={() => handleBuyCredits(pkg)}
                  className="relative w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-center hover:border-blue-500 hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden"
                >
                  <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                    <ShoppingBag size={24} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{pkg.name}</h3>
                  <div className="text-2xl font-black text-blue-600 mb-1">₹{pkg.price}</div>
                  <div className="text-xs font-bold text-slate-400 mb-3">{pkg.credits} Credits</div>

                  <div className="bg-slate-900 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 group-hover:bg-blue-600 transition-colors">
                    BUY <ArrowRight size={10} />
                  </div>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-800 text-center">
              After clicking "Buy", you will be redirected to WhatsApp. Send the message and complete payment to Admin.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

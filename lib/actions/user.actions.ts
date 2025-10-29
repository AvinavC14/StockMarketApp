'use server';

import {connectToDatabase} from "@/database/mongoose";

export const getAllUsersForNewsEmail = async () => {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if(!db) throw new Error('Mongoose connection not connected');

        const users = await db.collection('user').find(
            { email: { $exists: true, $ne: null }},
            { projection: { _id: 1, id: 1, email: 1, name: 1, country: 1 }}
        ).toArray();

        console.log('=== RAW USERS FROM DB ===');
        console.log('Sample user:', users[0]); // To see the structure
        
        return users.filter((user) => user.email && user.name).map((user) => {
            const userId = user.id || user._id?.toString() || '';
            console.log(`Mapping user: email=${user.email}, userId=${userId}`);
            
            return {
                userId: userId,  
                email: user.email,
                name: user.name,
                country: user.country
            };
        });
    } catch (e) {
        console.error('Error fetching users for news email:', e);
        return [];
    }
}